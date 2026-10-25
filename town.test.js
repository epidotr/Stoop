// Run with: node town.test.js  (simulates 10 minutes of town life and checks dots stay on streets)
const T = require('./town.js');
const assert = require('assert');
T.sync([{id:1,name:'Sam (you)',x:48,y:50},{id:2,name:'Maya',x:58,y:46},{id:3,name:'Dev',x:22,y:72},{id:4,name:'Rosa',x:80,y:70},{id:5,name:'Jonah',x:20,y:18}], 1);
assert.strictEqual(T.dots.length, 5 + T.NPCS.length);
assert(T.dots.find(d => d.nid === 1).kind === 'me' && T.dots.find(d => d.nid === 2).kind === 'neighbor');
const streets0 = new Map(T.dots.map(d => [d.id, d.street])); const changed = new Set();
let maxOff = 0;
for (let i = 0; i < 60 * 600; i++) {                      // ten simulated minutes at 60fps
  T.step(1/60);
  for (const d of T.dots) {
    assert(d.t >= 0 && d.t <= 1 && Number.isFinite(d.t), 'bad t ' + d.t);
    const s = T.STREETS[d.street], [x, y] = T.pos(d);
    const rx = s.b[0]-s.a[0], ry = s.b[1]-s.a[1];
    maxOff = Math.max(maxOff, Math.abs((x-s.a[0])*ry - (y-s.a[1])*rx) / s.len);   // distance from its own street line
    if (d.street !== streets0.get(d.id)) changed.add(d.id);
  }
}
console.log('junction map:', T.STREETS.map(s => s.j.length));
console.log('max off-street distance:', maxOff.toFixed(6), '| dots that changed street:', changed.size + '/' + T.dots.length, '| chats:', T.stats.chats);
assert(maxOff < 1e-6 && changed.size >= T.dots.length - 2 && T.stats.chats > 20);
const before = T.dots.length; T.sync([{id:1,name:'Sam (you)',x:48,y:50}], 1); assert.strictEqual(T.dots.length, 1 + T.NPCS.length, 'neighbors removed'); console.log('ok');
