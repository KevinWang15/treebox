export default function throttle(callback, wait, options = {}) {
  const leading = options.leading !== false;
  const trailing = options.trailing !== false;
  let lastCallTime = 0;
  let timeoutId = null;
  let pendingArgs;
  let pendingThis;

  const invoke = (time) => {
    lastCallTime = time;
    const args = pendingArgs;
    const context = pendingThis;
    pendingArgs = null;
    pendingThis = null;
    callback.apply(context, args);
  };

  const invokeTrailing = () => {
    timeoutId = null;
    if (trailing && pendingArgs) {
      invoke(Date.now());
    }
  };

  function throttled(...args) {
    const now = Date.now();
    if (!lastCallTime && !leading) {
      lastCallTime = now;
    }

    const remaining = wait - (now - lastCallTime);
    pendingArgs = args;
    pendingThis = this;

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      invoke(now);
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(invokeTrailing, remaining);
    }
  }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    lastCallTime = 0;
    timeoutId = null;
    pendingArgs = null;
    pendingThis = null;
  };

  return throttled;
}
