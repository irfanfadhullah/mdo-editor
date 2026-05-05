// ── MDO Viewer — Undo / Redo Stack ──────────────────────────

(function() {
  var MAX_DEPTH = 50;
  var undoStack = [];
  var redoStack = [];
  var _batchTimer = null;
  var _pendingEntry = null;

  function snapshot() {
    if (!window.UndoRedo._getBlocks) return null;
    var blocks = window.UndoRedo._getBlocks();
    return JSON.stringify(blocks);
  }

  function pushEntry(prev, next) {
    undoStack.push({ prev: prev, next: next });
    if (undoStack.length > MAX_DEPTH) undoStack.shift();
    redoStack = [];
  }

  window.UndoRedo = {
    MAX_DEPTH: MAX_DEPTH,

    _getBlocks: null,
    _setBlocks: null,

    init: function(getFn, setFn) {
      this._getBlocks = getFn;
      this._setBlocks = setFn;
    },

    recordChange: function(prevBlocks) {
      if (!this._getBlocks) return;
      var prev = JSON.stringify(prevBlocks || []);
      if (_batchTimer) clearTimeout(_batchTimer);
      var self = this;
      _batchTimer = setTimeout(function() {
        var next = snapshot();
        if (next && next !== prev) pushEntry(prev, next);
        _batchTimer = null;
      }, 250);
    },

    snapshotNow: function() {
      return snapshot();
    },

    undo: function() {
      if (!undoStack.length) return null;
      var entry = undoStack.pop();
      redoStack.push(entry);
      if (undoStack.length > MAX_DEPTH) undoStack.shift();
      return entry.prev;
    },

    redo: function() {
      if (!redoStack.length) return null;
      var entry = redoStack.pop();
      undoStack.push(entry);
      if (undoStack.length > MAX_DEPTH) undoStack.shift();
      return entry.next;
    },

    canUndo: function() { return undoStack.length > 0; },
    canRedo: function() { return redoStack.length > 0; },
    undoCount: function() { return undoStack.length; },
    redoCount: function() { return redoStack.length; },

    clear: function() {
      undoStack = [];
      redoStack = [];
    },
  };
})();
