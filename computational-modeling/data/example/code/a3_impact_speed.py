"""Assignment 3: does the accelerometer agree with the lab's impact speed,
and how much structure folded up?

Run this from the unzipped pack folder. It integrates the crossmember
accelerometer once to get the change in velocity over the whole record, compares
that with the speed the lab measured, then adds the lab's speed as the constant
of integration and integrates again to get the distance the compartment moved.
It prints every number in the memo and saves speed_and_crush.svg.
"""
import json
import os

import numpy as np
import matplotlib.pyplot as plt

G = 9.81   # m/s^2 in one g

folder = 'crash'
name = os.listdir(folder)[0]               # the crash folder holds one file
with open(os.path.join(folder, name)) as f:
    test = json.load(f)

# the only channel on the car body (header: V1 LEFT REAR SEAT CROSSMEMBER AX)
ch = test['channels']['vehicle_x']
dt = ch['dt']
t = ch['t0'] + dt * np.arange(ch['n'])   # seconds, 0 is the moment of contact
a = np.array(ch['y'])                     # m/s^2, forward is positive

# Before impact the car is towed at a steady speed, so its real acceleration is
# zero. Whatever the sensor reads then is an offset, so I take the average off.
offset = np.mean(a[t < 0])
a = a - offset
print(f"offset before impact: {offset:.3f} m/s^2")


def running_integral(y, dt):
    """Cumulative trapezoid sum, with the leading zero so it lines up with t."""
    panels = (y[1:] + y[:-1]) / 2 * dt      # the area of each panel
    running = np.cumsum(panels)
    return np.concatenate([[0.0], running])


i0 = np.argmax(t >= 0)            # first sample at the moment of contact
dv = running_integral(a, dt)
dv = dv - dv[i0]                  # change in velocity since contact

lab = test['test']['speed_kph'] / 3.6       # the lab's speed, km/h to m/s
change = -dv[-1]                            # speed lost over the whole record
gap = change - lab
print(f"lab speed: {test['test']['speed_kph']} km/h = {lab:.2f} m/s")
print(f"change in velocity, contact to end of record: {change:.2f} m/s")
print(f"gap: {gap:.2f} m/s ({100 * gap / lab:.1f}% of the lab speed)")

# The lab's speed is the constant: the velocity at contact. With it added the
# curve is the compartment's actual velocity.
v = lab + dv
stop = i0 + np.argmax(v[i0:] <= 0)          # first sample where it has stopped
print(f"stopped at {1000 * t[stop]:.1f} ms, velocity at end of record "
      f"{v[-1]:.2f} m/s")

# Integrate again for distance. The compartment is at the wall's face at
# contact, so I start the distance at zero there.
x = running_integral(v, dt)
x = x - x[i0]
crush = x[stop]
print(f"distance moved from contact to stopping: {1000 * crush:.0f} mm")
print(f"most rearward velocity: {np.min(v):.2f} m/s at {1000 * t[np.argmin(v)]:.1f} ms")
print(f"average deceleration to the stop: {lab / t[stop] / G:.1f} g")

# two panels, sharing the time axis
t_ms = 1000 * t
fig, axes = plt.subplots(2, 1, figsize=(7, 6.5), sharex=True)
top = axes[0]
bottom = axes[1]
top.plot(t_ms, v)
top.axhline(0, color='gray', linewidth=0.8)
top.axhline(lab, color='gray', linestyle='--', linewidth=0.8)
top.text(295, lab - 1.6, f"lab's speed {lab:.2f} m/s", ha='right')
top.plot(1000 * t[stop], 0, 'o')
top.text(1000 * t[stop] + 4, 1.0, f"stopped, {1000 * t[stop]:.1f} ms")
top.text(295, v[-1] - 0.6, f"end of record: {v[-1]:.2f} m/s", ha='right', va='top')
top.set_ylim(-5, 17.5)
top.set_ylabel('velocity (m/s)')
top.set_title('Compartment velocity (crossmember accelerometer + lab speed)')

bottom.plot(t_ms, 1000 * x)
bottom.plot(1000 * t[stop], 1000 * crush, 'o')
bottom.text(1000 * t[stop] + 4, 1000 * crush - 90, f"{1000 * crush:.0f} mm at the stop")
bottom.set_ylabel('distance since contact (mm)')
bottom.set_xlabel('time from contact (ms)')
bottom.set_title('Distance the compartment moved toward the barrier')
bottom.set_ylim(-200, 750)
top.set_xlim(-20, 300)
fig.tight_layout()
fig.savefig('speed_and_crush.svg')
