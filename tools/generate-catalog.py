"""Regenerate factual metadata; never generate statistical samples or probabilities."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--client', type=Path, required=True)
parser.add_argument('--lua', type=Path, required=True)
parser.add_argument('--backend', type=Path)
args = parser.parse_args()
sys.path.insert(0, str(args.client))
from dev_tools.utils import LuaLoader

loader = LuaLoader(str(args.lua), 'CN')
technology = loader.load('sharecfg/technology_data_template.lua')
commissions = loader.load('sharecfg/collection_template.lua')
lua_items = loader.load('sharecfgdata/item_data_statistics.lua')
tasks = loader.load('sharecfgdata/task_data_template.lua')
client_commissions = json.loads((args.client / 'assets/stats/commission_names.json').read_text(encoding='utf-8'))
names = json.loads((args.client / 'assets/stats/research_item_names.json').read_text(encoding='utf-8'))
storage = json.loads((args.client / 'assets/stats/storage_items/catalog.json').read_text(encoding='utf-8'))
storage_names = {i['id']: i['name'] for i in storage['items']}
categories = [
    ('blueprint-rainbow', '彩科研蓝图', '张'), ('blueprint-gold', '金科研蓝图', '张'),
    ('gear-rainbow', '彩装备设计图', '张'), ('gear-gold', '金装备设计图', '张'),
    ('gear-other', '其他装备设计图', '张'), ('cube', '心智魔方', '个'),
    ('coins', '物资', '物资'), ('oil', '石油', '石油'), ('chips', '心智单元', '个'),
    ('book', '技能教材', '本'), ('plate', '强化部件', '个'), ('retrofit', '改造图纸', '张'),
    ('box', '装备箱', '个'), ('gems', '钻石', '个'), ('drills', '快速完成工具', '个'),
    ('decor', '家具币', '个'),
]
units = {k: u for k, _, u in categories}
builtins = {'Cubes': ('心智魔方', 'cube'), 'Coins': ('物资', 'coins'), 'Oil': ('石油', 'oil'),
            'CognitiveChips': ('心智单元', 'chips'), 'Gems': ('钻石', 'gems'),
            'Drills': ('快速完成工具', 'drills'), 'DecorCoins': ('家具币', 'decor')}
items = {}
for scene, folder in [('research', 'research_items'), ('commission', 'commission_items')]:
    for file in sorted((args.client / 'assets/stats' / folder).glob('*.png')):
        template = file.stem
        base = re.sub(r'_\d+$', '', template)
        info = names.get(template, names.get(base, {}))
        name = info.get('zh') or storage_names.get(base)
        rarity = info.get('rarity', 0)
        category = None
        if base in builtins:
            name, category = builtins[base]
        elif base.startswith('Blueprint'):
            category = 'blueprint-rainbow' if rarity >= 5 else 'blueprint-gold' if rarity == 4 else None
        elif base.startswith('Book'):
            category = 'book'
            name = name or {'Blue': '防御', 'Red': '攻击', 'Yellow': '支援'}.get(re.search(r'Book(\w+?)T', base).group(1), '') + '教材' + base[-2:]
        elif base.startswith('Plate'):
            category = 'plate'
            name = name or {'General': '通用', 'Gun': '主炮', 'Torpedo': '鱼雷', 'AntiAir': '防空炮', 'Plane': '舰载机'}.get(base[5:-2], '') + '部件' + base[-2:]
        elif base.startswith('Retrofit'):
            category = 'retrofit'
            name = name or {'Battleship': '战列', 'Carrier': '航母', 'Cruiser': '巡洋', 'Destroyer': '驱逐'}.get(base[8:-2], '') + '改造图纸' + base[-2:]
        elif base.startswith('Box'):
            category = 'box'
            name = name or '装备箱' + base[-2:]
        elif name and '设计图' in name:
            category = 'gear-rainbow' if rarity >= 5 else 'gear-gold' if rarity == 4 else 'gear-other'
        if not category or not name:
            continue  # unknown templates must not be guessed into a category
        key = name
        entry = items.setdefault(key, {'id': base, 'name': name, 'category': category, 'unit': units[category], 'rarity': rarity, 'aliases': [], 'scenes': []})
        if template not in entry['aliases']:
            entry['aliases'].append(template)
        if scene not in entry['scenes']:
            entry['scenes'].append(scene)

research = {}
for row in technology.values():
    if not isinstance(row, dict) or not row.get('name'):
        continue
    series = int(row.get('blueprint_version', 0))
    key = f"{series}:{row['name']}"
    costs = []
    for cost in (row.get('consume') or {}).values():
        _, item_id, amount = cost.values()
        item = lua_items.get(59001 if item_id == 1 else item_id, {})
        costs.append({'name': item.get('name', f'道具 {item_id}'), 'amount': amount})
    if key in research and research[key]['duration'] != row['time']:
        raise ValueError(f'Ambiguous duration: {key}')
    research[key] = {'id': row['name'], 'name': row['name'], 'series': series,
                     'duration': row['time'], 'category': row['name'].split('-')[0], 'costs': costs,
                     'condition': tasks.get(row.get('condition', 0), {}).get('desc', '')}

commission = {}
by_name = {}
for row in commissions.values():
    if not isinstance(row, dict) or not row.get('title') or not row.get('type'):
        continue
    variants = by_name.setdefault(row['title'], {})
    key = (row['collect_time'], row['type'])
    meta = variants.setdefault(key, {'id': str(row['id']), 'name': row['title'], 'duration': row['collect_time'],
                              'category': str(row['type']), 'costs': [{'name': '石油', 'amount': row['oil']}] if row['oil'] else [], 'aliases': []})
    meta['aliases'].append(str(row['id']))
for name, variants in by_name.items():
    for key, meta in variants.items():
        commission[name if len(variants) == 1 else f'{name}:{key[1]}'] = meta
for row in client_commissions['entries']:
    variants = by_name.get(row['name'], {})
    if not variants:
        h, m, s = map(int, (row['duration'] or '0:00:00').split(':'))
        meta = {'id': row['code'] or row['name'], 'name': row['name'], 'duration': h * 3600 + m * 60 + s, 'category': 'unknown', 'costs': [], 'aliases': []}
        commission[row['name']] = meta
        variants = {(meta['duration'], 0): meta}
    for _, meta in variants.items():
        if len(variants) > 1 and meta['category'] == '5':
            aliases = [row['code'] + ' N'] if row['code'] else []
            meta['name'] = row['name'] + '（夜间）'
        else:
            aliases = [row['code'], *[a for values in row['aliases'].values() for a in values]]
        meta['aliases'] = sorted(set(meta['aliases'] + [a for a in aliases if a]))

# A translated title can refer to two missions. Remove that alias entirely so
# queries require an explicit code rather than depending on dictionary order.
alias_owners = {}
for key, meta in commission.items():
    for alias in meta['aliases']:
        alias_owners.setdefault(alias, set()).add(key)
for meta in commission.values():
    meta['aliases'] = [alias for alias in meta['aliases'] if len(alias_owners[alias]) == 1]

sources = {}
for root, relative in [(args.lua, 'CN/sharecfg/technology_data_template.lua'), (args.lua, 'CN/sharecfg/collection_template.lua'),
                       (args.lua, 'CN/sharecfgdata/task_data_template.lua'), (args.lua, 'CN/sharecfgdata/item_data_statistics.lua'),
                       (args.client, 'assets/stats/commission_names.json'),
                       (args.client, 'assets/stats/research_item_names.json'), (args.client, 'assets/stats/storage_items/catalog.json')]:
    sources[relative] = hashlib.sha256((root / relative).read_bytes()).hexdigest()
catalog = {'sources': sources, 'categories': [{'id': k, 'name': n, 'unit': u} for k, n, u in categories],
           'items': sorted(items.values(), key=lambda x: (x['category'], x['name'])),
           'research': research, 'commission': commission}
output = Path(__file__).resolve().parents[1] / 'src/data/catalog.json'
output.parent.mkdir(parents=True, exist_ok=True)
encoded = json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'
output.write_text(encoded, encoding='utf-8')
if args.backend:
    (args.backend / 'internal/drops/analysis_catalog.json').write_text(encoded, encoding='utf-8')
print(f'{len(items)} items, {len(research)} research projects, {len(commission)} commissions')
