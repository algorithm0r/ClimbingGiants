"""Assignment 9: where the customer's car sits among the cars in the building.

Run this from the unzipped pack folder. My own test is in crash/, and the files
my two colleagues sent me are in fleet/. For every car it computes the driver's
HIC15 the same way (CFC 1000 on each head axis, resultant in g, every window up
to 15 ms), prints one line per car, and saves one figure (fleet_hic15.svg).
"""
import glob
import json
import math
import os

import matplotlib.pyplot as plt
import numpy as np

G = 9.80665      # standard gravity, m/s^2
LIMIT = 700      # FMVSS 208 limit on HIC15
PACK = '.'       # the unzipped pack folder


def cfc(y, dt, cls):
    """SAE J211-1 filter: 4-pole Butterworth, run forward then backward."""
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
    """Largest HIC over every window up to limit_ms. A running integral
    (trapezoid rule) makes each window's integral one subtraction."""
    panels = (a_g[1:] + a_g[:-1]) / 2 * dt
    S = np.concatenate([[0.0], np.cumsum(panels)])
    kmax = int(round(limit_ms / 1000 / dt))      # the limit in samples
    best = 0.0
    for k in range(1, kmax + 1):
        T = k * dt
        mean = np.clip((S[k:] - S[:-k]) / T, 0, None)   # every start at once
        best = max(best, float(np.max(T * mean ** 2.5)))
    return best


def head_hic15(test):
    """Driver head resultant at CFC 1000, in g, then HIC15."""
    ch = {}                                  # each channel under its ISO code
    for c in test['channels'].values():
        ch[c['code']] = c
    dt = ch['11HEADCG0000ACXP']['dt']
    axes = []
    for a in 'XYZ':                          # a string loops one letter at a time
        y = np.array(ch['11HEADCG0000AC' + a + 'P']['y'])
        axes.append(cfc(y, dt, 1000))
    res = np.sqrt(axes[0] ** 2 + axes[1] ** 2 + axes[2] ** 2) / G
    return hic(res, dt, 15), dt


cars = []
paths = glob.glob(os.path.join(PACK, 'crash', '*.json'))
paths = paths + sorted(glob.glob(os.path.join(PACK, 'fleet', '*.json')))
for path in paths:
    with open(path) as f:
        test = json.load(f)
    v = test['vehicle']
    info = test['test']
    name = f"{v['year']} {v['make'].title()} {v['model'].strip().title()}"
    value, dt = head_hic15(test)
    mine = os.path.basename(os.path.dirname(path)) == 'crash'
    cars.append((value, name, mine))
    print(f"{test['testNo']:5}  {name:24} {info['type']:33} {info['speed_kph']:6.2f} km/h  "
          f"{1 / dt:6.0f} samples/s  HIC15 {value:6.1f}  ({100 * value / LIMIT:4.1f}% of limit)")
    # the header details I compared by eye
    print(f"       model field {v['model']!r}, {info['config']}, angle {info['angle']}, "
          f"head X described as {test['channels']['head_x']['comment']!r}")

# one figure: the three cars on the full scale, with the limit drawn in
cars.sort()                  # each car is (value, name, mine), so this sorts by value
fig, ax = plt.subplots(figsize=(7, 2.8))
names = []
for i in range(len(cars)):
    value = cars[i][0]
    name = cars[i][1]
    mine = cars[i][2]
    names.append(name)
    if mine:
        ax.barh(i, value, color='tab:orange')
        ax.text(value + 8, i, f"{value:.1f}" + '  (customer)', va='center')
    else:
        ax.barh(i, value, color='tab:gray')
        ax.text(value + 8, i, f"{value:.1f}", va='center')
ax.axvline(LIMIT, color='tab:red', linestyle='--')
ax.text(LIMIT - 10, 1, 'FMVSS 208\nlimit, 700', color='tab:red', ha='right', va='center')
ax.set_yticks(range(len(cars)))
ax.set_yticklabels(names)
ax.set_xlim(0, 760)
ax.set_xlabel('driver HIC15, CFC 1000 (no unit, as quoted in FMVSS 208)')
ax.set_title('Driver head injury number, three cars into the same barrier at about 56 km/h',
             fontsize=10)
fig.tight_layout()
fig.savefig('fleet_hic15.svg')
