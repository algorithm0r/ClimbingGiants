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
import json

import matplotlib.pyplot as plt

G = 9.81                    # m/s^2 in one g
RATES = [20000, 10000, 5000, 2000, 1000, 500]   # Hz, the usual 1-2-5 steps
TOLERANCE = 0.05            # a peak may read at most 5% low
PROPOSED = 1000             # Hz, the cheaper logger

with open('crash/09793.json') as f:
    test = json.load(f)
channels = test['channels']


def in_g(key):
    return [v / G for v in channels[key]['y']]


def peak(y):
    return max(abs(v) for v in y)


def worst_peak(y, k):
    """The lowest peak a logger keeping every k-th sample could read."""
    return min(peak(y[start::k]) for start in range(k))


def best_peak(y, k):
    return max(peak(y[start::k]) for start in range(k))


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

# worst-case peak as a fraction of the 20 kHz peak, for each measurement and rate
fraction = {}
print(f"\n{'measurement':30} {'20 kHz peak':>11}  worst-case peak at each rate (% of 20 kHz)")
print(f"{'':30} {'(g)':>11}  " + ' '.join(f"{r:>7}" for r in RATES))
for name, y in list(dummy.items()) + list(structure.items()) + list(head_other.items()):
    full = peak(y)
    fraction[name] = []
    for r in RATES:
        k = rate_now // r          # every rate here divides 20000 exactly
        fraction[name].append(worst_peak(y, k) / full)
    print(f"{name:30} {full:11.1f}  " + ' '.join(f"{100 * p:7.1f}" for p in fraction[name]))

# the lowest rate on the list where no dummy measurement reads more than 5% low
ok_rates = [r for i, r in enumerate(RATES)
            if all(fraction[name][i] >= 1 - TOLERANCE for name in dummy)]
lowest = min(ok_rates)
print(f"\nLowest rate keeping every dummy peak within {100 * TOLERANCE:.0f}%: {lowest} Hz")
for r in RATES:
    if r < lowest:
        i = RATES.index(r)
        name = min(dummy, key=lambda n: fraction[n][i])
        print(f"  {r} Hz fails on {name}: {100 * fraction[name][i]:.1f}%")
        break

# what the proposed logger would read, worst start and best start
k = rate_now // PROPOSED
print(f"\nAt {PROPOSED} Hz (every {k}th sample):")
for name, y in list(dummy.items()) + list(structure.items()):
    full, low, high = peak(y), worst_peak(y, k), best_peak(y, k)
    print(f"  {name:30} {full:6.1f} g reads {low:6.1f} to {high:6.1f} g "
          f"(worst {100 * low / full:.1f}%, loses up to {full - low:.1f} g)")

# the figure: worst-case peak against rate, dummy solid, structure dashed
plt.figure(figsize=(7, 4.2))
for name in dummy:
    plt.semilogx(RATES, [100 * p for p in fraction[name]], 'o-', label=name)
for name in structure:
    plt.semilogx(RATES, [100 * p for p in fraction[name]], 's--', color='gray',
                 label=name + ' (structure)')
plt.axhline(100 * (1 - TOLERANCE), color='black', linewidth=0.8, linestyle=':',
            label='5% below the 20 kHz peak')
plt.axvline(PROPOSED, color='red', linewidth=0.8)
plt.text(PROPOSED * 1.05, 60, 'proposed\n1 kHz logger', color='red', fontsize=8)
plt.xticks(RATES, [str(r) for r in RATES])
plt.xlabel('sample rate (Hz, log scale)')
plt.ylabel('worst-case peak (% of the 20 kHz peak)')
plt.title('Lowest peak a slower logger could read, test 9793', fontsize=10)
plt.legend(fontsize=8, loc='lower right')
plt.tight_layout()
plt.savefig('worst_case_peaks.svg')
