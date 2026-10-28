"""Assignment 1: inspect the crash test in a data pack.

Run this from the unzipped pack folder. It prints the test description and the
largest value in each channel, and saves the figures used in the report:
one per channel (channel_<key>.svg) and the chest displacement both ways
(chest_d_units.svg).
"""
import glob
import json
import os

import matplotlib.pyplot as plt

G = 9.81      # m/s^2 in one g
PACK = '.'    # the unzipped pack folder


def load_test(pack):
    """The crash folder holds one file, the test."""
    folder = os.path.join(pack, 'crash')
    name = glob.glob(os.path.join(folder, '*.json'))[0]
    with open(name) as f:
        return json.load(f)


def times_ms(ch):
    """The file stores no times. t0, dt and n give them, here in milliseconds."""
    t = []
    for i in range(ch['n']):
        t.append(1000 * (ch['t0'] + i * ch['dt']))
    return t


def micrometers_to_mm(y):
    """Every value divided by 1000."""
    out = []
    for v in y:
        out.append(v / 1000)
    return out


test = load_test(PACK)
v = test['vehicle']
info = test['test']
print(f"Test {test['testNo']}: {v['year']} {v['make']} {v['model']}, "
      f"{info['config']} at {info['speed_kph']} km/h")

# the largest value in each channel, and when it happens
print(f"{'description':36} {'unit':8} {'largest':>9} {'in g':>6} {'at (ms)':>8}")
for key, ch in test['channels'].items():
    t = times_ms(ch)
    y = ch['y']
    i = 0                                # index of the largest size so far
    for k in range(len(y)):
        if abs(y[k]) > abs(y[i]):
            i = k
    if ch['dimension'] == 'Acceleration':
        in_g = f"{y[i] / G:6.1f}"
    else:
        in_g = '     -'
    print(f"{ch['comment']:36} {ch['unit']:8} {y[i]:9.1f} {in_g} {t[i]:8.1f}")

# one figure per channel, labeled from its own header
for key, ch in test['channels'].items():
    y = ch['y']
    unit = ch['unit']
    dim = ch['dimension']
    if key == 'chest_d':   # header says m and 'Meters', values are micrometers
        y = micrometers_to_mm(y)
        unit = 'mm'
        dim = 'Displacement'
    plt.figure(figsize=(5, 3))
    plt.plot(times_ms(ch), y, linewidth=0.8)
    plt.axvline(0, color='gray', linestyle='--', linewidth=0.8)
    plt.title(f"{ch['comment']}  [{ch['code']}]", fontsize=9)
    plt.xlabel('time from impact (ms)')
    plt.ylabel(f"{dim} ({unit})")
    plt.tight_layout()
    plt.savefig(f"channel_{key}.svg")
    plt.close()

# the chest displacement as labeled, and read as micrometers
ch = test['channels']['chest_d']
fig, axes = plt.subplots(1, 2, figsize=(10, 3.2))
a = axes[0]
b = axes[1]
a.plot(times_ms(ch), ch['y'], color='tab:red', linewidth=0.8)
a.set_title('as the header labels it')
a.set_ylabel('chest displacement (m, per header)')
b.plot(times_ms(ch), micrometers_to_mm(ch['y']), linewidth=0.8)
b.set_title('read as micrometers, shown in mm')
b.set_ylabel('chest displacement (mm)')
for ax in axes:
    ax.set_xlabel('time from impact (ms)')
fig.tight_layout()
fig.savefig('chest_d_units.svg')
