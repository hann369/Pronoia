const blocks = [
  { title: 'Morning Hydration & Stack', startTime: '07:30', duration: 15*60, pillar: 'health' },
  { title: 'Deep Work Block I', startTime: '08:30', duration: 90*60, pillar: 'focus' },
  { title: 'Deliberate Skill Practice', startTime: '11:00', duration: 45*60, pillar: 'skills' },
  { title: 'Zirkadianer Lunch Walk', startTime: '13:00', duration: 30*60, pillar: 'health' },
  { title: 'Deep Work Block II', startTime: '14:30', duration: 60*60, pillar: 'focus' },
  { title: 'Sunset NSDR Recovery', startTime: '17:30', duration: 25*60, pillar: 'recovery' }
];

const now = new Date("2026-06-04T13:02:55");
const h = now.getHours();
const m = now.getMinutes();
const s = now.getSeconds();
const nowMin = h * 60 + m;

console.log("Local time:", h + ":" + m + ":" + s, "nowMin:", nowMin);

// 1. Build virtual schedule
const virtualBlocks = [];
let currentStartMin = 480;

const firstWithStart = blocks.find(b => b.startTime);
if (firstWithStart) {
  const [bh, bm] = firstWithStart.startTime.split(':').map(Number);
  currentStartMin = bh * 60 + bm;
}

for (let i = 0; i < blocks.length; i++) {
  const b = blocks[i];
  let startMin = currentStartMin;
  if (b.startTime) {
    const [bh, bm] = b.startTime.split(':').map(Number);
    startMin = bh * 60 + bm;
  }
  const durationMin = b.duration / 60;
  const endMin = startMin + durationMin;

  virtualBlocks.push({
    ...b,
    calculatedStartMin: startMin,
    calculatedEndMin: endMin
  });

  currentStartMin = endMin;
}

console.log("Virtual blocks:");
virtualBlocks.forEach((vb, i) => {
  console.log(`  Block ${i}: ${vb.title} [${Math.floor(vb.calculatedStartMin/60)}:${vb.calculatedStartMin%60} - ${Math.floor(vb.calculatedEndMin/60)}:${vb.calculatedEndMin%60}] (${vb.calculatedStartMin} - ${vb.calculatedEndMin})`);
});

// 2. Find active block
let foundIdx = -1;
for (let i = 0; i < virtualBlocks.length; i++) {
  const vb = virtualBlocks[i];
  if (nowMin >= vb.calculatedStartMin && nowMin < vb.calculatedEndMin) {
    foundIdx = i;
    break;
  }
}
console.log("Step 1 foundIdx:", foundIdx);

if (foundIdx === -1) {
  const firstStartMin = virtualBlocks[0].calculatedStartMin;
  const lastEndMin = virtualBlocks[virtualBlocks.length - 1].calculatedEndMin;

  console.log("firstStartMin:", firstStartMin, "lastEndMin:", lastEndMin);

  if (nowMin < firstStartMin) {
    foundIdx = 0;
  } else if (nowMin >= lastEndMin) {
    foundIdx = virtualBlocks.length - 1;
  } else {
    let upcomingIdx = -1;
    let minDiff = Infinity;
    for (let i = 0; i < virtualBlocks.length; i++) {
      const vb = virtualBlocks[i];
      if (vb.calculatedStartMin > nowMin && (vb.calculatedStartMin - nowMin) < minDiff) {
        minDiff = vb.calculatedStartMin - nowMin;
        upcomingIdx = i;
      }
    }
    foundIdx = upcomingIdx !== -1 ? upcomingIdx : 0;
  }
}

console.log("Final foundIdx:", foundIdx);
console.log("Selected Block:", virtualBlocks[foundIdx].title);
