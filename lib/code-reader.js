"use babel";

import { CompositeDisposable } from "atom";

class CodeReader {
  constructor() {
    this.subscriptions = null;
  }

  activate(state) {
    this.decorationsByEditorId = {};
    this.colors = ["green", "blue", "red"];
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "code-reader:toggle": () => this.toggle()
      })
    );
  }

  deactivate() {
    this.subscriptions.dispose();
  }

  serialize() {
    return {};
  }

  toggle() {
    this.toggleDecorationForCurrentSelection();
  }

  createDecorationFromCurrentSelection(editor, color) {
    const range = editor.getSelectedBufferRange();
    const marker = editor.markBufferRange(range, { invalidate: "never" });
    const decoration = editor.decorateMarker(marker, {
      type: "line-number",
      class: `line-number-${color}`
    });
    return decoration;
  }

  updateDecoration(decoration, newDecorationParams) {
    return decoration.setProperties(newDecorationParams);
  }

  destroyDecorationMarker(decoration) {
    return decoration.getMarker().destroy();
  }

  getCachedDecoration(editor) {
    return this.decorationsByEditorId[editor.id];
  }

  setCachedDecoration(editor, decoration) {
    this.decorationsByEditorId[editor.id] = decoration;
    return decoration;
  }

  toggleDecorationForCurrentSelection() {
    let editor;
    if (!(editor = atom.workspace.getActiveTextEditor())) {
      return;
    }
    let decoration = this.getCachedDecoration(editor);
    if (decoration != null) {
      this.destroyDecorationMarker(decoration);
      this.setCachedDecoration(editor, null);
    } else {
      decoration = this.createDecorationFromCurrentSelection(editor, "green");
      this.setCachedDecoration(editor, decoration);
    }
    atom.views.getView(atom.workspace).focus();
    return decoration;
  }
}

export default new CodeReader();
