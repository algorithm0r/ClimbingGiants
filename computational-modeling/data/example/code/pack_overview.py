"""Assignment 1: what is in the data pack.

Run this from the unzipped pack folder. It lists the files, prints a line for
each crash channel, and draws every channel on one page (all_channels.svg).
"""
import json
import os

import matplotlib.pyplot as plt

PACK = '.'   # the unzipped pack folder

for folder in ['', 'crash', 'shots']:
    print(folder or 'top level', sorted(os.listdir(os.path.join(PACK, folder))))

name = os.listdir(os.path.join(PACK, 'crash'))[0]
with open(os.path.join(PACK, 'crash', name)) as f:
    test = json.load(f)
print(test['vehicle'], test['test'])

fig, axes = plt.subplots(4, 2, figsize=(10, 11), sharex=True)
for ax, (key, ch) in zip(axes.flat, test['channels'].items()):
    t_ms = [1000 * (ch['t0'] + i * ch['dt']) for i in range(ch['n'])]
    before = [y for t, y in zip(t_ms, ch['y']) if t < 0]
    print(f"{key:12} {ch['unit']:8} n={ch['n']} dt={ch['dt']} {ch['status']}  "
          f"min {min(ch['y']):.1f}  max {max(ch['y']):.1f}  "
          f"mean before impact {sum(before) / len(before):.2f}")
    ax.plot(t_ms, ch['y'], linewidth=0.8)
    ax.set_title(f"{ch['comment']}  [{ch['code']}]", fontsize=9)
    ax.set_ylabel(ch['unit'])
for ax in axes[-1]:
    ax.set_xlabel('time from impact (ms)')

v = test['vehicle']
fig.suptitle(f"Test {test['testNo']}, {v['year']} {v['make']} {v['model']}: "
             "every channel, as labeled in the file")
fig.tight_layout()
fig.savefig('all_channels.svg')
