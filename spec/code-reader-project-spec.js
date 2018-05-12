"use babel";

import CodeReaderProject from "../lib/code-reader-project";

TEST_DATA_1 = `
{
  "lib/code-reader.js": {
    "green": [[1, 10], [20, 30]],
    "blue": [[15, 17], [31, 35]],
    "red": [[11, 14], [18, 19]]
  },
  ".gitignore": {
    "green": [[1, 4]]
  }
}
`;

describe("CodeReaderProject", () => {
  it("can load a string", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
  });

  it("can give you a list of ranges for a file and color", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    expect(project.getRanges("lib/code-reader.js", "green")).toEqual([
      [1, 10],
      [20, 30]
    ]);
    expect(project.getRanges("lib/code-reader.js", "red")).toEqual([
      [11, 14],
      [18, 19]
    ]);
  });

  it("returns an empty array for an unknown file", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    expect(project.getRanges("test.txt", "green")).toEqual([]);
  });

  it("returns an empty array for a known file but unknown color", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    expect(project.getRanges(".gitignore", "green")).toEqual([[1, 4]]);
    expect(project.getRanges(".gitignore", "red")).toEqual([]);
  });

  it("can add a non-overlapping range to an existing color", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    const instructions = project.addRange(".gitignore", "green", [7, 10]);
    expect(project.getRanges(".gitignore", "green")).toEqual([[1, 4], [7, 10]]);
    expect(instructions.deletions).toEqual([]);
    expect(instructions.additions).toEqual([[7, 10]]);
  });

  it("can add a non-overlapping range to an existing color, keeping the range sorted", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "green", [20, 30]);
    const instructions = project.addRange(".gitignore", "green", [7, 10]);
    expect(project.getRanges(".gitignore", "green")).toEqual([
      [1, 4],
      [7, 10],
      [20, 30]
    ]);
    expect(instructions.deletions).toEqual([]);
    expect(instructions.additions).toEqual([[7, 10]]);
  });

  it("can add a range to a new color of an existing file", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    const instructions = project.addRange(".gitignore", "red", [20, 30]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[20, 30]]);
    expect(instructions.deletions).toEqual([]);
    expect(instructions.additions).toEqual([[20, 30]]);
  });

  it("can add a range to a new color of a new file", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    const instructions = project.addRange("test.txt", "red", [20, 30]);
    expect(project.getRanges("test.txt", "red")).toEqual([[20, 30]]);
    expect(instructions.deletions).toEqual([]);
    expect(instructions.additions).toEqual([[20, 30]]);
  });

  it("can add overlapping ranges : <  [  >  ]", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 10]);
    const instructions = project.addRange(".gitignore", "red", [5, 15]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 15]]);
    expect(instructions.deletions).toEqual([[1, 10]]);
    expect(instructions.additions).toEqual([[1, 15]]);
  });

  it("can add overlapping ranges : <[    >  ]", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 10]);
    const instructions = project.addRange(".gitignore", "red", [1, 15]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 15]]);
    expect(instructions.deletions).toEqual([[1, 10]]);
    expect(instructions.additions).toEqual([[1, 15]]);
  });

  it("can add overlapping ranges : [<    >  ]", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 15]);
    const instructions = project.addRange(".gitignore", "red", [1, 10]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 15]]);
    expect(instructions.deletions).toEqual([[1, 15]]);
    expect(instructions.additions).toEqual([[1, 15]]);
  });

  it("can add overlapping ranges : <  >[   ]", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 10]);
    const instructions = project.addRange(".gitignore", "red", [10, 20]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 20]]);
    expect(instructions.deletions).toEqual([[1, 10]]);
    expect(instructions.additions).toEqual([[1, 20]]);
  });

  it("can add overlapping ranges : <  [   ]  >", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 20]);
    const instructions = project.addRange(".gitignore", "red", [10, 15]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 20]]);
    expect(instructions.deletions).toEqual([[1, 20]]);
    expect(instructions.additions).toEqual([[1, 20]]);
  });

  it("can add overlapping ranges : [   ]<    >", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 10]);
    const instructions = project.addRange(".gitignore", "red", [11, 20]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 20]]);
    expect(instructions.deletions).toEqual([[1, 10]]);
    expect(instructions.additions).toEqual([[1, 20]]);
  });

  it("can delete a range: XX<XX>XX", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [5, 10]);
    const instructions = project.deleteRange(".gitignore", "red", [1, 20]);
    expect(project.getRanges(".gitignore", "red")).toEqual([]);
    expect(instructions.deletions).toEqual([[5, 10]]);
    expect(instructions.additions).toEqual([]);
  });

  it("can delete a range: <  >XXXXX<  >", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 20]);
    const instructions = project.deleteRange(".gitignore", "red", [5, 10]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 4], [11, 20]]);
    expect(instructions.deletions).toEqual([[1, 20]]);
    expect(instructions.additions).toEqual([[1, 4], [11, 20]]);
  });

  it("can delete a range: < XXX>XXX", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 20]);
    project.addRange(".gitignore", "red", [30, 40]);
    const instructions = project.deleteRange(".gitignore", "red", [35, 50]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 20], [30, 34]]);
    expect(instructions.deletions).toEqual([[30, 40]]);
    expect(instructions.additions).toEqual([[30, 34]]);
  });

  it("can delete a range: XXX<XX  >", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 20]);
    project.addRange(".gitignore", "red", [30, 40]);
    const instructions = project.deleteRange(".gitignore", "red", [25, 35]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 20], [36, 40]]);
    expect(instructions.deletions).toEqual([[30, 40]]);
    expect(instructions.additions).toEqual([[36, 40]]);
  });

  it("should not delete: <>xxxx", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 2]);
    project.deleteRange(".gitignore", "red", [3, 4]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 2]]);
  });

  it("should not delete: xxxxx<>", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [3, 4]);
    project.deleteRange(".gitignore", "red", [1, 2]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[3, 4]]);
  });

  it("should have no effect when adding a range that is subsumed", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    const instructions = project.addRange(".gitignore", "green", [3, 4]);
    expect(instructions.deletions).toEqual([[1, 4]]);
    expect(instructions.additions).toEqual([[1, 4]]);
    expect(project.getRanges(".gitignore", "green")).toEqual([[1, 4]]);
  });

  it("should be capable of doing a 3-way merge <  >[]<  >", () => {
    const project = CodeReaderProject.loadFromString(TEST_DATA_1);
    project.addRange(".gitignore", "red", [1, 10]);
    project.addRange(".gitignore", "red", [20, 30]);
    const instructions = project.addRange(".gitignore", "red", [11, 19]);
    expect(project.getRanges(".gitignore", "red")).toEqual([[1, 30]]);
    expect(instructions.deletions).toEqual([[1, 10], [20, 30]]);
    expect(instructions.additions).toEqual([[1, 30]]);
  });
});
