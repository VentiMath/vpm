export async function checkCustomEffects(current, vpm) {
  for (const api of [current, vpm]) {
    const node = document.createElement('div');
    document.body.append(node);
    const subject = { kind: 'custom', node, x: 0 };
    let writes = 0;
    const effect = api.createEffect((subject, state, key, value) => state.set(key, value, () => {
      subject[key] = value.get(); writes++;
      subject.node.style.transform = `translateX(${subject.x}px)`;
    }), { test: s => s?.kind === 'custom', read: (s, key) => s[key], step: api.frame.preRender });
    const [a] = api.animateEffectSubject(effect, subject, { x: [0, 30] }, { duration: .06, ease: 'linear' });
    await a.finished;
    await new Promise(requestAnimationFrame);
    if (subject.x !== 30 || getComputedStyle(node).transform !== 'matrix(1, 0, 0, 1, 30, 0)' || writes < 2)
      throw Error('custom effect did not animate real DOM output');
    const value = effect.get(subject, 'x');
    effect.state(subject).release();
    const before = writes;
    value.set(99);
    await new Promise(requestAnimationFrame);
    if (writes !== before) throw Error('released custom effect kept rendering');
    node.remove();
  }
  const effect = vpm.createEffect((s, state, key, value) => state.set(key, value, () => s[key] = value.get()), {
    test: s => !!s?.custom, read: (s, key) => s[key],
  });
  const s = { custom: true, x: 0 };
  vpm.animate.addEffect(effect);
  try {
    await vpm.animate(s, { x: 20 }, { duration: .04, ease: 'linear' });
    await new Promise(requestAnimationFrame);
    if (s.x !== 20) throw Error('registered animate did not complete');
  } finally { vpm.animate.removeEffect(effect); effect.state(s)?.release(); }
}
