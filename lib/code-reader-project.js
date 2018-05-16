"use babel";

const fs = require("fs");
const path = require("path");

const LINE_COUNT = "_lineCount";

function eq_ranges(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function intersect_ranges_in_place(ranges, to_intersect) {
  let i = 0;
  while (i < ranges.length) {
    let found = false;
    for (to_have of to_intersect) {
      if (eq_ranges(ranges[i], to_have)) {
        found = true;
        break;
      }
    }
    if (!found) {
      ranges.splice(i, 1);
    } else {
      i++;
    }
  }
}

class CodeReaderProject {
  static colors() {
    return ["green", "blue", "red"];
  }

  static loadFromString(s) {
    return new CodeReaderProject(JSON.parse(s));
  }

  static load(dir) {
    file_path = path.join(dir, ".code-reader.json");
    if (fs.existsSync(file_path) && fs.statSync(file_path).isFile()) {
      return CodeReaderProject.loadFromString(fs.readFileSync(file_path));
    } else {
      return new CodeReaderProject();
    }
  }

  constructor(data) {
    data = data || {};
    this.data = data;
  }

  save(dir) {
    file_path = path.join(dir, ".code-reader.json");
    fs.writeFileSync(file_path, JSON.stringify(this.data, null, 2));
  }

  setLineCount(path, lineCount) {
    this._ensureLineCount(path);
    this.data[path][LINE_COUNT] = lineCount;
  }

  getLineCount(path) {
    this._ensureLineCount(path);
    return this.data[path][LINE_COUNT];
  }

  hasColor(path, color) {
    this._ensure(path, color);
    return this.data[path][color].length > 0;
  }

  isMostlyColored(path) {
    this._ensureLineCount(path);
    if (this.getLineCount(path) === 0) {
      return false;
    }
    let count = 0;
    for (color of CodeReaderProject.colors()) {
      this._ensure(path, color);
      for (range of this.data[path][color]) {
        count += range[1] - range[0] + 1;
      }
    }
    return count / this.getLineCount(path) >= 0.8;
  }

  getRanges(path, color) {
    this._ensure(path, color);
    return this.data[path][color];
  }

  addRange(path, color, range) {
    this._ensure(path, color);
    const original_ranges = [...this.data[path][color]];
    this.data[path][color].push(range);
    this._sortRanges(path, color);
    return this._mergeRangesAfterAdding(path, color, original_ranges, range);
  }

  deleteRange(path, color, range) {
    this._ensure(path, color);
    const instructions = { deletions: [], additions: [] };
    const ranges = this.data[path][color];
    let i = 0;
    current_lo = () => ranges[i][0];
    current_hi = () => ranges[i][1];
    delete_lo = range[0];
    delete_hi = range[1];
    while (i < ranges.length) {
      /* delete tail : <  xx>xxx */
      if (
        i < ranges.length &&
        delete_lo > current_lo() &&
        delete_lo <= current_hi() &&
        delete_hi >= current_hi()
      ) {
        instructions.additions.push([current_lo(), delete_lo - 1]);
        instructions.deletions.push([current_lo(), current_hi()]);
        ranges.splice(i, 1, [current_lo(), delete_lo - 1]);
      }
      /* delete head : xxx<xx  > */
      if (
        i < ranges.length &&
        delete_lo < current_lo() &&
        delete_hi >= current_lo() &&
        delete_hi <= current_hi()
      ) {
        instructions.additions.push([delete_hi + 1, current_hi()]);
        instructions.deletions.push([current_lo(), current_hi()]);
        ranges.splice(i, 1, [delete_hi + 1, current_hi()]);
      }
      /* delete entire range : xxx<xxx>xxx */
      while (
        i < ranges.length &&
        delete_lo <= current_lo() &&
        delete_hi >= current_hi()
      ) {
        instructions.deletions.push([current_lo(), current_hi()]);
        ranges.splice(i, 1);
      }
      /* delete part of range : <  xxx  > */
      if (
        i < ranges.length &&
        delete_lo >= current_lo() &&
        delete_hi <= current_hi()
      ) {
        const left = [current_lo(), delete_lo - 1];
        const right = [delete_hi + 1, current_hi()];
        instructions.additions.push(left);
        instructions.additions.push(right);
        instructions.deletions.push([current_lo(), current_hi()]);
        ranges.splice(i, 1, left, right);
        return instructions;
      }
      i++;
    }
    return instructions;
  }

  _ensure(path, color) {
    this.data[path] = this.data[path] || {};
    this.data[path][color] = this.data[path][color] || [];
  }

  _ensureLineCount(path) {
    this.data[path] = this.data[path] || {};
    this.data[path][LINE_COUNT] = this.data[path][LINE_COUNT] || 0;
  }

  _sortRanges(path, color) {
    this.data[path][color].sort((a1, a2) => {
      return a1[0] - a2[0];
    });
  }

  _mergeRangesAfterAdding(path, color, original_ranges, added_range) {
    const ranges = this.data[path][color];
    const instructions = { deletions: [], additions: [] };
    let i = 0;
    let has_merged = false;
    curr_lo = () => ranges[i][0];
    curr_hi = () => ranges[i][1];
    next_lo = () => ranges[i + 1][0];
    next_hi = () => ranges[i + 1][1];
    while (i < ranges.length - 1) {
      let consecutive_merge = false;
      while (i < ranges.length - 1 && curr_hi() >= next_lo() - 1) {
        const merged = [curr_lo(), Math.max(curr_hi(), next_hi())];
        if (consecutive_merge) {
          instructions.additions.pop();
        }
        instructions.additions.push(merged);
        instructions.deletions.push([curr_lo(), curr_hi()]);
        instructions.deletions.push([next_lo(), next_hi()]);
        ranges.splice(i, 2, merged);
        has_merged = true;
        consecutive_merge = true;
      }
      i++;
    }
    intersect_ranges_in_place(instructions.deletions, original_ranges);
    if (!has_merged) {
      instructions.additions.push(added_range);
    }
    return instructions;
  }
}

export default CodeReaderProject;
