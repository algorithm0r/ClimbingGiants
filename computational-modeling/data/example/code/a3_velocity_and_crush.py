"""Assignment 3: impact speed and crush distance from the crossmember accelerometer.

Run this from the unzipped pack folder. It prints every number in the report
(the comparison with the lab's speed, the crush, and the table of processing
choices) and saves the three figures:
    fig1_acceleration.svg   the channel with its pre-contact offset removed
    fig2_delta_v.svg        change in velocity since contact, constant set to zero
    fig3_velocity_crush.svg velocity with the lab's speed added, and distance
"""
import json
import os

import numpy as np
import matplotlib.pyplot as plt

G = 9.81   # m/s^2 in one g


def load_test(pack='.'):
    folder = os.path.join(pack, 'crash')
    with open(os.path.join(folder, os.listdir(folder)[0])) as f:
        return json.load(f)


def running_integral(y, dt, rule='trapezoid'):
    """Cumulative integral with the leading zero, so it lines up with t."""
    if rule == 'trapezoid':
        panels = (y[1:] + y[:-1]) / 2 * dt
    else:                                  # rectangle, left-hand sample
        panels = y[:-1] * dt
    return np.concatenate([[0.0], np.cumsum(panels)])


def analyse(a, t, dt, lab, baseline=True, rule='trapezoid'):
    """Everything the report needs from one set of processing choices."""
    if baseline:
        a = a - a[t < 0].mean()        # towed at constant speed before contact
    i0 = np.argmax(t >= 0)
    dv = running_integral(a, dt, rule)
    dv = dv - dv[i0]                   # change since contact
    v = lab + dv                       # the lab's speed is the constant
    stop = i0 + np.argmax(v[i0:] <= 0)
    x = running_integral(v, dt, rule)
    x = x - x[i0]
    return {'a': a, 'dv': dv, 'v': v, 'x': x, 'stop': stop,
            'peak': dv.argmin(), 'crush': x[stop]}


test = load_test()
ch = test['channels']['vehicle_x']      # V1 LEFT REAR SEAT CROSSMEMBER AX
dt = ch['dt']
t = ch['t0'] + dt * np.arange(ch['n'])
raw = np.array(ch['y'])
lab = test['test']['speed_kph'] / 3.6

print(f"channel {ch['code']}: {ch['comment']}, {ch['n']} samples every {dt} s")
print(f"lab speed {test['test']['speed_kph']} km/h = {lab:.2f} m/s")

before = raw[t < 0]
print(f"before contact: mean {before.mean():.3f} m/s^2, "
      f"standard deviation {before.std():.3f} m/s^2")

r = analyse(raw, t, dt, lab)
peak, stop = r['peak'], r['stop']
print(f"largest change in velocity {-r['dv'][peak]:.2f} m/s at {1000 * t[peak]:.1f} ms"
      f"  (gap to lab {-r['dv'][peak] - lab:.2f} m/s, "
      f"{100 * (-r['dv'][peak] - lab) / lab:.1f}%)")
print(f"change over the whole record {-r['dv'][-1]:.2f} m/s"
      f"  (gap to lab {-r['dv'][-1] - lab:.2f} m/s, "
      f"{100 * (-r['dv'][-1] - lab) / lab:.1f}%)")
after = (t > t[peak]) & (t <= 0.15)
print(f"mean acceleration from {1000 * t[peak]:.1f} to 150 ms: "
      f"{r['a'][after].mean() / G:.2f} g")
print(f"mean acceleration over the last 50 ms: {r['a'][t > 0.25].mean():.3f} m/s^2")
print(f"stopped at {1000 * t[stop]:.1f} ms, crush {1000 * r['crush']:.0f} mm")
print(f"velocity at end of record {r['v'][-1]:.2f} m/s")

# how much each processing choice moves the answers
print()
print(f"{'baseline':9} {'rule':10} {'dv peak':>8} {'dv end':>7} "
      f"{'stop ms':>8} {'crush mm':>9}")
choices = [(True, 'trapezoid'), (False, 'trapezoid'), (True, 'rectangle')]
for baseline, rule in choices:
    s = analyse(raw, t, dt, lab, baseline, rule)
    print(f"{'yes' if baseline else 'no':9} "
          f"{rule:10} {-s['dv'][s['peak']]:8.2f} {-s['dv'][-1]:7.2f} "
          f"{1000 * t[s['stop']]:8.1f} {1000 * s['crush']:9.0f}")

# how much the constant moves the crush
print()
for c in [lab - 0.1, lab + 0.1, -r['dv'][-1]]:
    s = analyse(raw, t, dt, c)
    print(f"constant {c:.2f} m/s: stop {1000 * t[s['stop']]:.1f} ms, "
          f"crush {1000 * s['crush']:.0f} mm")

t_ms = 1000 * t

# Figure 1: the channel in g, offset removed
plt.figure(figsize=(7, 3.6))
plt.plot(t_ms, r['a'] / G, linewidth=0.7, label='as recorded, offset removed')
plt.axvline(0, color='gray', linestyle='--', linewidth=0.8)
plt.xlim(-20, 160)
plt.xlabel('time from contact (ms)')
plt.ylabel('acceleration (g)')
plt.title('Left rear seat crossmember, X acceleration [10SEATLERE00ACXP]')
plt.legend(loc='lower right')
plt.tight_layout()
plt.savefig('fig1_acceleration.svg')
plt.close()

# Figure 2: change in velocity, constant set to zero
plt.figure(figsize=(7, 3.6))
plt.plot(t_ms, r['dv'])
plt.axhline(-lab, color='gray', linestyle='--', linewidth=0.8)
plt.text(295, -lab + 0.6, f"minus the lab's speed, {-lab:.2f} m/s", ha='right')
plt.plot(t_ms[peak], r['dv'][peak], 'o')
plt.text(t_ms[peak] + 4, r['dv'][peak] - 1.6,
         f"{r['dv'][peak]:.2f} m/s at {t_ms[peak]:.1f} ms")
plt.plot(t_ms[-1], r['dv'][-1], 'o')
plt.text(295, r['dv'][-1] - 0.8, f"{r['dv'][-1]:.2f} m/s at 300 ms",
         ha='right', va='top')
plt.ylim(-21, 2)
plt.xlabel('time from contact (ms)')
plt.ylabel('change in velocity (m/s)')
plt.title('Change in velocity since contact (crossmember, constant = 0)')
plt.tight_layout()
plt.savefig('fig2_delta_v.svg')
plt.close()

# Figure 3: velocity with the lab's constant, and distance
fig, (top, bottom) = plt.subplots(2, 1, figsize=(7, 6), sharex=True)
top.plot(t_ms, r['v'])
top.axhline(0, color='gray', linewidth=0.8)
top.plot(t_ms[stop], 0, 'o')
top.text(t_ms[stop] + 4, 1.0, f"zero at {t_ms[stop]:.1f} ms")
top.set_ylabel('velocity (m/s)')
top.set_title('(a) Velocity of the compartment, lab speed as the constant')
bottom.plot(t_ms, 1000 * r['x'])
bottom.plot(t_ms[stop], 1000 * r['crush'], 'o')
bottom.text(t_ms[stop] + 4, 1000 * r['crush'] - 90, f"{1000 * r['crush']:.0f} mm")
bottom.set_ylim(-100, 750)
bottom.set_xlim(-10, 160)
bottom.set_xlabel('time from contact (ms)')
bottom.set_ylabel('distance since contact (mm)')
bottom.set_title('(b) Distance travelled toward the barrier')
fig.tight_layout()
fig.savefig('fig3_velocity_crush.svg')
