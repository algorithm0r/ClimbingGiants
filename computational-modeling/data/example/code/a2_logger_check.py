"""Assignment 2: what would a slower logger have read from our crash test?

Run this from the unzipped pack folder. It makes the slower records out of the
one we have by keeping every k-th sample (a 1 kHz logger keeps every 20th
sample of a 20 kHz record). A real logger could start its samples on any of
those k samples, so for each rate it tries every start and keeps the lowest
peak, which is the worst case.

It prints the worst-case peak of each dummy measurement at each rate (and of
the head's sideways and vertical channels, for reference), the lowest rate that keeps every dummy measurement within 5%, and what the proposed
1 kHz logger would read. It saves the figure in the memo (worst_case_peaks.svg).
"""
import glob
import json

import matplotlib.pyplot as plt

G = 9.81                    # m/s^2 in one g
RATES = [20000, 10000, 5000, 2000, 1000, 500]   # Hz, the usual 1-2-5 steps
TOLERANCE = 0.05            # a peak may read at most 5% low
PROPOSED = 1000             # Hz, the cheaper logger

name = glob.glob('crash/*.json')[0]     # the crash folder holds one test file
with open(name) as f:
    test = json.load(f)
channels = test['channels']


def in_g(key):
    out = []
    for v in channels[key]['y']:
        out.append(v / G)
    return out


def peak(y):
    """The largest size in y, ignoring sign."""
    biggest = abs(y[0])
    for v in y:
        if abs(v) > biggest:
            biggest = abs(v)
    return biggest


def peaks_by_start(y, k):
    """The peak a logger keeping every k-th sample reads, for each start 0..k-1."""
    peaks = []
    for start in range(k):
        peaks.append(peak(y[start::k]))
    return peaks


def worst_peak(y, k):
    """The lowest peak a logger keeping every k-th sample could read."""
    return min(peaks_by_start(y, k))


def best_peak(y, k):
    return max(peaks_by_start(y, k))


def percent(fractions):
    out = []
    for p in fractions:
        out.append(100 * p)
    return out


# the dummy is judged along the direction of travel (X), where the crash pushes hardest
dummy = {
    'driver head X': in_g('head_x'),
    'driver chest X': in_g('chest_x'),
    'driver pelvis X': in_g('pelvis_x'),
    'passenger head X': in_g('pass_head_x'),
}
structure = {'left rear seat crossmember X': in_g('vehicle_x')}
# printed for reference, not part of the 5% test
head_other = {'driver head Y': in_g('head_y'), 'driver head Z': in_g('head_z')}

rate_now = round(1 / channels['head_x']['dt'])
print(f"Recorded at {rate_now} Hz ({channels['head_x']['n']} samples per channel)")

# every measurement in one dictionary, in the order above
measurements = {}
for group in (dummy, structure, head_other):
    for name in group:
        measurements[name] = group[name]

# worst-case peak as a fraction of the 20 kHz peak, for each measurement and rate
fraction = {}
print(f"\n{'measurement':30} {'20 kHz peak':>11}  worst-case peak at each rate (% of 20 kHz)")
columns = []
for r in RATES:
    columns.append(f"{r:>7}")
print(f"{'':30} {'(g)':>11}  " + ' '.join(columns))
for name, y in measurements.items():
    full = peak(y)
    fraction[name] = []
    for r in RATES:
        k = rate_now // r          # every rate here divides 20000 exactly
        fraction[name].append(worst_peak(y, k) / full)
    columns = []
    for p in fraction[name]:
        columns.append(f"{100 * p:7.1f}")
    print(f"{name:30} {full:11.1f}  " + ' '.join(columns))

# the lowest rate on the list where no dummy measurement reads more than 5% low
ok_rates = []
for i in range(len(RATES)):
    passes = True
    for name in dummy:
        if fraction[name][i] < 1 - TOLERANCE:
            passes = False
    if passes:
        ok_rates.append(RATES[i])
lowest = min(ok_rates)
print(f"\nLowest rate keeping every dummy peak within {100 * TOLERANCE:.0f}%: {lowest} Hz")
for r in RATES:
    if r < lowest:
        i = RATES.index(r)
        name = None                    # the dummy measurement that loses the most here
        for n in dummy:
            if name is None or fraction[n][i] < fraction[name][i]:
                name = n
        print(f"  {r} Hz fails on {name}: {100 * fraction[name][i]:.1f}%")
        break

# what the proposed logger would read, worst start and best start
k = rate_now // PROPOSED
print(f"\nAt {PROPOSED} Hz (every {k}th sample):")
for group in (dummy, structure):
    for name, y in group.items():
        full = peak(y)
        low = worst_peak(y, k)
        high = best_peak(y, k)
        print(f"  {name:30} {full:6.1f} g reads {low:6.1f} to {high:6.1f} g "
              f"(worst {100 * low / full:.1f}%, loses up to {full - low:.1f} g)")

# the figure: worst-case peak against rate, dummy solid, structure dashed
plt.figure(figsize=(7, 4.2))
for name in dummy:
    plt.semilogx(RATES, percent(fraction[name]), 'o-', label=name)
for name in structure:
    plt.semilogx(RATES, percent(fraction[name]), 's--', color='gray',
                 label=name + ' (structure)')
plt.axhline(100 * (1 - TOLERANCE), color='black', linewidth=0.8, linestyle=':',
            label='5% below the 20 kHz peak')
plt.axvline(PROPOSED, color='red', linewidth=0.8)
plt.text(PROPOSED * 1.05, 60, 'proposed\n1 kHz logger', color='red', fontsize=8)
labels = []
for r in RATES:
    labels.append(str(r))
plt.xticks(RATES, labels)
plt.xlabel('sample rate (Hz, log scale)')
plt.ylabel('worst-case peak (% of the 20 kHz peak)')
plt.title('Lowest peak a slower logger could read, test 9793', fontsize=10)
plt.legend(fontsize=8, loc='lower right')
plt.tight_layout()
plt.savefig('worst_case_peaks.svg')
