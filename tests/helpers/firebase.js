export function makeSnapshot(name, snapData, priority) {
  var data = {};
  data[name] = snapData;

  var fb = new window.MockFirebase("https://app.firebaseio.com", data);
  fb.autoFlush(true);

  var snapshot;
  if (priority !== undefined) {
    fb.child(name).setPriority(priority);
  }
  fb.child(name).once("value", function(s) { snapshot = s; });
  // fb.flush();

  return snapshot;
}

export function getSnapshot(fb, path) {
  var snapshot;
  fb.child(path).once("value", function(s) { snapshot = s; });
  // fb.flush();
  return snapshot;
}