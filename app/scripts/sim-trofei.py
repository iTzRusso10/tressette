# Quante partite servono per la trentesima arena (2900 trofei).
# I trofei li dà solo la partita veloce: +25/−10 contro persone, +12/−5 quando al tavolo c'è un computer
# al posto di chi non si è trovato in tempo. Il matchmaking mette insieme persone di trofei vicini, quindi
# si vince circa una partita su due; chi è più bravo un po' di più. Non si scende sotto l'arena raggiunta.
import random, statistics

PERSONE = (25, 10)
COMPUTER = (12, 5)

def run(rate_people, rate_cpu, cpu_share, top=2900, step=100, runs=4000):
    out = []
    for _ in range(runs):
        t = best = 0
        n = 0
        while t < top:
            n += 1
            cpu = random.random() < cpu_share
            win, loss = COMPUTER if cpu else PERSONE
            floor = (min(29, best // step)) * step
            if random.random() < (rate_cpu if cpu else rate_people):
                t += win
            else:
                t = max(floor, t - loss)
            best = max(best, t)
        out.append(n)
    out.sort()
    return statistics.mean(out), out[len(out) // 10], out[9 * len(out) // 10]

giocatori = {'debole': (0.45, 0.50), 'tipico': (0.50, 0.58), 'forte': (0.56, 0.68)}
for nome, (rp, rc) in giocatori.items():
    for share in (0.0, 0.2, 0.5):
        a, lo, hi = run(rp, rc, share)
        print(f"{nome:7} computer nel {int(share * 100):2}% delle partite: media {a:5.0f}  (10%-90%: {lo}-{hi})")
