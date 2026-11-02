mergeInto(LibraryManager.library, {
  CrowdForgeEvent: function (pointer) {
    window.dispatchEvent(new CustomEvent('crowdforge:unity', { detail: UTF8ToString(pointer) }));
  }
});
