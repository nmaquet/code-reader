"use babel";

import { CompositeDisposable, Point, Range } from "atom";
import CodeReaderProject from "./code-reader-project";

function toAtomRange(range) {
  return new Range(new Point(range[0] - 1, 0), new Point(range[1], 0));
}

function fromAtomRange(atomRange) {
  const [x, y] = atomRange.serialize();
  return [x[0] + 1, y[0]];
}

class CodeReader {
  constructor() {
    this.project = null;
    this.subscriptions = null;
  }

  activate(state) {
    this.colors = ["green", "blue", "red"];
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "code-reader:color-selection-clear": () => {
          this._loadProject(atom.workspace.getActiveTextEditor());
          this._decolorize_selection();
          this._saveProject();
        },
        "code-reader:color-selection-green": () => {
          this._loadProject(atom.workspace.getActiveTextEditor());
          this._colorize_selection("green");
          this._saveProject();
        },
        "code-reader:color-selection-blue": () => {
          this._loadProject(atom.workspace.getActiveTextEditor());
          this._colorize_selection("blue");
          this._saveProject();
        },
        "code-reader:color-selection-red": () => {
          this._loadProject(atom.workspace.getActiveTextEditor());
          this._colorize_selection("red");
          this._saveProject();
        }
      })
    );
    atom.workspace.observeTextEditors(editor => {
      this._loadProject(editor);
      this._loadMarkers(editor);
    });
  }

  deactivate() {
    this.subscriptions.dispose();
  }

  serialize() {
    return {};
  }

  _loadProject(editor) {
    const [dir, _] = atom.project.relativizePath(editor.getPath());
    this.project = CodeReaderProject.load(dir);
  }

  _saveProject() {
    const [dir, _] = atom.project.relativizePath(editor.getPath());
    this.project.save(dir);
  }

  _loadMarkers(editor) {
    const [dir, path] = atom.project.relativizePath(editor.getPath());
    for (let color of this.colors) {
      this._decorateRanges(editor, color, this.project.getRanges(path, color));
    }
  }

  _decorateRanges(editor, color, ranges) {
    ranges.forEach(range => {
      decoration = editor.decorateMarker(
        editor.markBufferRange(toAtomRange(range), { invalidate: "never" }),
        {
          type: "line-number",
          class: `line-number-${color}`,
          packageName: "code-reader",
          codeReaderColor: color
        }
      );
    });
  }

  _undecorateRanges(editor, color, ranges) {
    editor
      .getLineNumberDecorations({
        packageName: "code-reader",
        codeReaderColor: color
      })
      .filter(decoration =>
        ranges.some(range => {
          let [a1, a2] = range;
          let [b1, b2] = fromAtomRange(decoration.getMarker().getBufferRange());
          return a1 == b1 && a2 == b2;
        })
      )
      .forEach(decoration => {
        decoration.destroy();
      });
  }

  _colorize_selection(color) {
    this._decolorize_selection();
    const [dir, path] = atom.project.relativizePath(editor.getPath());
    const range = fromAtomRange(editor.getSelectedBufferRange());
    const lineCount = editor.getLineCount();
    if (range[1] == lineCount - 1 && editor.getText().endsWith("\n")) {
      // do nothing
    } else if (range[1] == lineCount - 1 && !editor.getText().endsWith("\n")) {
      // do nothing
    } else {
      range[1] += 1;
    }
    const instructions = this.project.addRange(path, color, range);
    this._undecorateRanges(editor, color, instructions.deletions);
    this._decorateRanges(editor, color, instructions.additions);
  }

  _decolorize_selection() {
    editor = atom.workspace.getActiveTextEditor();
    const [dir, path] = atom.project.relativizePath(editor.getPath());
    const range = fromAtomRange(editor.getSelectedBufferRange());
    const lineCount = editor.getLineCount();
    if (range[1] == lineCount - 1 && editor.getText().endsWith("\n")) {
      // do nothing
    } else if (range[1] == lineCount - 1 && !editor.getText().endsWith("\n")) {
      // do nothing
    } else {
      range[1] += 1;
    }
    for (let color of this.colors) {
      const instructions = this.project.deleteRange(path, color, range);
      this._undecorateRanges(editor, color, instructions.deletions);
      this._decorateRanges(editor, color, instructions.additions);
    }
  }
}

export default new CodeReader();
