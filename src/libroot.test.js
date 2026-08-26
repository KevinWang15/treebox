import TreeBox from "./libroot";

test("keeps the legacy default export alias", () => {
  expect(TreeBox.default).toBe(TreeBox);
  expect(Object.keys(TreeBox)).toContain("default");
});
