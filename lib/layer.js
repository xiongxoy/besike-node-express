module.exports = Layer;

function Layer(path, middleware) {
  this.path = path;
  this.handle = middleware;
}

function escapeRegex(value) {
    return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

Layer.prototype.match = function(url) {
  if (this.path == '/') {
    return {
      path: this.path
    };
  }
  var re = new RegExp("^" + escapeRegex(this.path) + '(\/|$)', "i");
  if (re.test(url)) {
    return {
      path: this.path
    };
  }
};
