import random, statistics
WIN={'facile':10,'medio':20,'esperto':30,'online':30}
LOSS={'facile':0,'medio':5,'esperto':10,'online':10}
def run(mix, rate, top=2900, step=100, runs=4000):
    out=[]
    for _ in range(runs):
        t=best=0;n=0
        while t<top:
            lv=random.choices(list(mix),weights=list(mix.values()))[0]
            n+=1
            floor=(min(29,best//step))*step
            if random.random()<rate[lv]: t+=WIN[lv]
            else: t=max(floor,t-LOSS[lv])
            best=max(best,t)
        out.append(n)
    out.sort()
    return statistics.mean(out), out[len(out)//10], out[9*len(out)//10]
tipico={'facile':.70,'medio':.50,'esperto':.38,'online':.50}
debole={'facile':.60,'medio':.42,'esperto':.30,'online':.42}
forte ={'facile':.85,'medio':.62,'esperto':.50,'online':.58}
profili={'solo Facile':{'facile':1},'solo Medio':{'medio':1},'solo Esperto':{'esperto':1},'misto (30/40/20/10)':{'facile':.3,'medio':.4,'esperto':.2,'online':.1}}
for nome,r in [('tipico',tipico),('debole',debole),('forte',forte)]:
    for p,m in profili.items():
        a,lo,hi=run(m,r)
        print(f"{nome:7} {p:22} media {a:5.0f}  (10%-90%: {lo}-{hi})")
