"""Assignment 9: benchmarking the customer's HIC15 against the other cars.

Run this from the unzipped pack folder. The customer's test is in crash/ and the
tests from the two colleagues are in fleet/. For each car the program:
  - reads the header (vehicle, test type, speed, sample rate),
  - filters the three driver head axes at CFC 1000, resultant in g,
  - finds HIC15 and its window, and HIC36 for comparison,
then runs two checks (sample rate and filter) and saves fig1_fleet.svg
(the HIC15 values) and fig2_resultants.svg (the head traces).
"""
import glob
import json
import math
import os

import matplotlib.pyplot as plt
import numpy as np

G = 9.80665      # standard gravity, m/s^2
LIMIT = 700      # FMVSS 208 limit on HIC15
PACK = '.'


def cfc(y, dt, cls):
    """SAE J211-1 filter class: 4-pole Butterworth, forward then backward."""
    wd = 2 * math.pi * cls * 2.0775
    wa = math.tan(wd * dt / 2)
    d = 1 + math.sqrt(2) * wa + wa ** 2
    a0 = wa ** 2 / d
    b1 = -2 * (wa ** 2 - 1) / d
    b2 = (-1 + math.sqrt(2) * wa - wa ** 2) / d

    def one_pass(x):
        out = np.zeros_like(x)
        for i in range(2, len(x)):
            out[i] = (a0 * x[i] + 2 * a0 * x[i - 1] + a0 * x[i - 2]
                      + b1 * out[i - 1] + b2 * out[i - 2])
        return out

    forward = one_pass(y)
    backward = one_pass(forward[::-1])
    return backward[::-1]


def hic(a_g, dt, limit_ms):
    """HIC over every window up to limit_ms. Returns (value, (first, last))."""
    panels = (a_g[1:] + a_g[:-1]) / 2 * dt
    S = np.concatenate([[0.0], np.cumsum(panels)])
    kmax = int(round(limit_ms / 1000 / dt))      # the limit in samples
    best = 0.0
    window = (0, 0)
    for k in range(1, kmax + 1):
        T = k * dt
        v = T * np.clip((S[k:] - S[:-k]) / T, 0, None) ** 2.5   # every start at once
        i = int(np.argmax(v))
        if v[i] > best:
            best = float(v[i])
            window = (i, i + k)
    return best, window


def resultant(axes, dt, cls=1000):
    """Filter each axis (cls=None skips it), then the resultant in g."""
    if cls:
        filtered = []
        for a in axes:
            filtered.append(cfc(a, dt, cls))
        axes = filtered
    return np.sqrt(axes[0] ** 2 + axes[1] ** 2 + axes[2] ** 2) / G


def by_h15(car):
    """What the cars are sorted by."""
    return car['h15']


cars = []
paths = glob.glob(os.path.join(PACK, 'crash', '*.json'))
paths = paths + sorted(glob.glob(os.path.join(PACK, 'fleet', '*.json')))
for path in paths:
    with open(path) as f:
        test = json.load(f)
    ch = {}                                  # each channel under its ISO code
    for c in test['channels'].values():
        ch[c['code']] = c
    hx = ch['11HEADCG0000ACXP']
    dt = hx['dt']
    t0 = hx['t0']
    axes = []
    for a in 'XYZ':                          # a string loops one letter at a time
        axes.append(np.array(ch['11HEADCG0000AC' + a + 'P']['y']))
    res = resultant(axes, dt)
    t_ms = 1000 * (t0 + dt * np.arange(len(res)))
    h15, window = hic(res, dt, 15)
    i = window[0]
    j = window[1]
    v = test['vehicle']
    statuses = set()
    for c in ch.values():
        statuses.add(c['status'])
    car = {}
    car['no'] = test['testNo']
    car['mine'] = 'crash' in path
    car['info'] = test['test']
    car['model'] = v['model']
    car['name'] = f"{v['year']} {v['make'].title()} {v['model'].strip().title()}"
    car['axes'] = axes
    car['dt'] = dt
    car['t'] = t_ms
    car['res'] = res
    car['h15'] = h15
    car['h36'] = hic(res, dt, 36)[0]
    car['win'] = (t_ms[i], t_ms[j])
    car['peak'] = np.max(res)
    car['peak_t'] = t_ms[np.argmax(res)]
    car['descr'] = hx['comment']
    car['status'] = statuses
    cars.append(car)

for c in cars:
    info = c['info']
    print(f"{c['no']} {c['name']}  (model field {c['model']!r})")
    print(f"   {info['type']}, {info['config']}, angle {info['angle']}, "
          f"{info['speed_kph']} km/h")
    print(f"   {1 / c['dt']:.0f} samples/s, head X described as {c['descr']!r}, "
          f"status {c['status']}")
    print(f"   HIC15 {c['h15']:.1f}, window {c['win'][0]:.2f} to {c['win'][1]:.2f} ms,"
          f" HIC36 {c['h36']:.1f}, peak {c['peak']:.1f} g at {c['peak_t']:.1f} ms")

h15 = []
for c in cars:
    h15.append(c['h15'])
h15 = sorted(h15)
for c in cars:
    if c['mine']:
        me = c                               # the customer's car
print(f"\ncustomer's car is {h15.index(me['h15']) + 1} of {len(cars)}, lowest first")
print(f"range {h15[0]:.1f} to {h15[-1]:.1f}, median {np.median(h15):.1f}, "
      f"highest is {100 * h15[-1] / LIMIT:.1f}% of the limit")
for c in cars:
    if not c['mine']:
        print(f"customer minus {c['name']}: HIC15 {me['h15'] - c['h15']:+.1f}, "
              f"HIC36 {me['h36'] - c['h36']:+.1f}")

# check 1: the customer's car was sampled twice as fast as the other two.
# Keep every second sample (10,000 a second, like the others) and recompute.
every_second = []
for a in me['axes']:
    every_second.append(a[::2])
half = resultant(every_second, 2 * me['dt'])
print(f"\ncheck, customer's car at half the sample rate: "
      f"HIC15 {hic(half, 2 * me['dt'], 15)[0]:.1f}")
# check 2: no filter at all, every car
for c in cars:
    raw = resultant(c['axes'], c['dt'], None)
    print(f"check, {c['name']} with no filter: HIC15 {hic(raw, c['dt'], 15)[0]:.1f}")

# Figure 1: the three HIC15 values on a scale close enough to see the gaps
order = sorted(cars, key=by_h15)             # lowest HIC15 first
fig, ax = plt.subplots(figsize=(7, 2.6))
labels = []
for k in range(len(order)):
    c = order[k]
    if c['mine']:
        color = 'tab:orange'
        labels.append(c['name'] + ' (customer)')
    else:
        color = 'tab:blue'
        labels.append(c['name'])
    ax.plot(c['h15'], k, 'o', ms=9, color=color)
    ax.annotate(f"{c['h15']:.1f}", (c['h15'], k), xytext=(0, 9),
                textcoords='offset points', ha='center')
ax.set_yticks(range(len(order)))
ax.set_yticklabels(labels)
ax.set_ylim(-0.6, len(order) - 0.2)
ax.set_xlim(100, 220)
ax.set_xlabel('driver HIC15, CFC 1000 (no unit; the limit, 700, is off this scale)')
ax.set_title('Figure 1. Driver HIC15, three cars, same barrier, about 56 km/h',
             fontsize=10)
ax.grid(axis='x', alpha=0.3)
fig.savefig('fig1_fleet.svg', bbox_inches='tight')

# Figure 2: the head resultant for each car with its HIC15 window shaded
fig, axs = plt.subplots(3, 1, figsize=(7, 7), sharex=True, sharey=True)
for k in range(len(cars)):
    ax = axs[k]
    c = cars[k]
    ax.plot(c['t'], c['res'], linewidth=0.9)
    ax.axvspan(c['win'][0], c['win'][1], color='tab:orange', alpha=0.25)
    ax.set_title(f"{c['name']} (test {c['no']}): HIC15 {c['h15']:.1f}, "
                 f"window {c['win'][0]:.1f} to {c['win'][1]:.1f} ms", fontsize=9)
    ax.set_ylabel('head resultant (g)')
axs[-1].set_xlim(-10, 200)
axs[-1].set_xlabel('time from impact (ms)')
fig.suptitle('Figure 2. Driver head resultant, CFC 1000, HIC15 window shaded',
             fontsize=10)
fig.tight_layout()
fig.savefig('fig2_resultants.svg', bbox_inches='tight')
