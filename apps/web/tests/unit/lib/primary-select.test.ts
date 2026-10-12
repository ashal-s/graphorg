import { effectivePrimary } from "@/components/directory/primary-select";

describe("effectivePrimary", () => {
  it("keeps the chosen primary while it is still selected", () => {
    expect(effectivePrimary(["a", "b"], "b")).toBe("b");
  });

  it("falls back to the first selected when the choice was deselected", () => {
    expect(effectivePrimary(["a", "b"], "gone")).toBe("a");
    expect(effectivePrimary(["a", "b"], "")).toBe("a");
  });

  it("is null when nothing is selected", () => {
    expect(effectivePrimary([], "a")).toBeNull();
  });
});
