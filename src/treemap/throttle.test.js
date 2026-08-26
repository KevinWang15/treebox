import throttle from "./throttle";

test("runs on the leading edge and suppresses calls within the wait", () => {
  const callback = jest.fn();
  const throttled = throttle(callback, 350, {
    leading: true,
    trailing: false,
  });
  const now = jest
    .spyOn(Date, "now")
    .mockReturnValueOnce(1000)
    .mockReturnValueOnce(1100)
    .mockReturnValueOnce(1400);

  throttled("first");
  throttled("ignored");
  throttled("next");

  expect(callback).toHaveBeenCalledTimes(2);
  expect(callback).toHaveBeenNthCalledWith(1, "first");
  expect(callback).toHaveBeenNthCalledWith(2, "next");
  now.mockRestore();
});
