"""Generate item form choices from game data, without statistical samples."""
import argparse
import ast
import hashlib
import json
import re
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--client', type=Path, required=True)
parser.add_argument('--lua', type=Path, required=True)
parser.add_argument('--stdout', action='store_true')
args = parser.parse_args()
sys.path.insert(0, str(args.client))
from dev_tools.utils import LuaLoader

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / 'src/data/catalog.json').read_text(encoding='utf-8'))
loader = LuaLoader(str(args.lua), 'CN')
sources = {}

def load(path):
    sources['CN/' + path] = hashlib.sha256((args.lua / 'CN' / path).read_bytes()).hexdigest()
    return loader.load(path)

items = load('sharecfgdata/item_data_statistics.lua')
blueprints = load('sharecfg/ship_data_blueprint.lua')
ships = load('sharecfgdata/ship_data_statistics.lua')
equips = load('sharecfgdata/equip_data_statistics.lua')
ship_types = load('sharecfg/ship_data_by_type.lua')
equip_types = load('sharecfg/equip_data_by_type.lua')
name_codes = load('sharecfg/name_code.lua')
extractor = args.client / 'dev_tools/ship_data_extractor.py'
sources['dev_tools/ship_data_extractor.py'] = hashlib.sha256(extractor.read_bytes()).hexdigest()
nations = next(ast.literal_eval(node.value) for node in ast.parse(extractor.read_text(encoding='utf-8-sig')).body
               if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == 'NATION_NAME_MAP')

def name(value):
    return re.sub(r'\{namecode:(\d+)\}', lambda match: name_codes.get(int(match[1]), {}).get('name', match[0]), value or '')

def matching_name(value):
    return value.replace('舰艇', '').replace('辅助教材', '支援教材').replace('舰炮部件', '主炮部件')

known = {matching_name(row['name']): row for row in catalog['items']}
units = {row['id']: row['unit'] for row in catalog['categories']}
ship_by_item = {row['strengthen_item']: row for row in blueprints.values() if isinstance(row, dict)}
options, ship_choices, equip_choices = [], {}, {}

for key, item in items.items():
    if not isinstance(item, dict):
        continue
    title, rarity = name(item.get('name')), item.get('rarity', 0)
    category, series, faction, subtype, ship_id, equipment_id = '', 0, '', '', '', ''
    tier_match = re.search(r'T\d+', title)
    tier = tier_match[0] if tier_match else ''
    if key in ship_by_item:
        blueprint = ship_by_item[key]
        ship_id = str(blueprint['id'])
        ship = ships.get(blueprint['id'] * 10 + 1, {})
        title = '蓝图：' + name(blueprint['name'])
        category = 'blueprint-rainbow' if rarity == 5 else 'blueprint-gold'
        series = blueprint['blueprint_version']
        faction = nations.get(ship.get('nationality'), '')
        subtype = ship_types.get(ship.get('type'), {}).get('type_name', '')
        ship_choices[ship_id] = {'id': ship_id, 'name': name(blueprint['name']), 'series': series, 'faction': faction, 'subtype': subtype}
    elif item.get('type') == 9 and title.endswith('设计图'):
        category = 'gear-rainbow' if rarity == 5 else 'gear-gold' if rarity == 4 else 'gear-other'
        icon_id = item.get('icon', '').rsplit('/', 1)[-1]
        equip = equips.get(int(icon_id), {}) if icon_id.isdigit() else {}
        if equip:
            equipment_id = str(equip['id'])
            faction = nations.get(equip.get('nationality'), '')
            kind = equip_types.get(equip.get('type'), {})
            subtype = kind.get('type_name2') or kind.get('type_name', '')
            equip_choices[equipment_id] = {'id': equipment_id, 'name': name(equip.get('name')), 'tier': tier, 'faction': faction, 'subtype': subtype}
    elif matching_name(title) in known:
        category = known[matching_name(title)]['category']
    elif '教材' in title and item.get('type') == 10:
        category = 'book'
    elif '部件' in title and item.get('type') == 4 and tier:
        category = 'plate'
    elif '改造图纸' in title and tier:
        category = 'retrofit'
    elif ('科技箱' in title or '装备箱' in title) and tier:
        category = 'box'
    if category in ('book', 'plate', 'retrofit', 'box'):
        subtype = re.sub(r'T\d+', '', title).replace('舰艇', '').replace('教材', '').replace('部件', '').replace('改造图纸', '').replace('科技箱', '').replace('装备箱', '')
    prior = known.get(matching_name(title))
    options.append({
        'item_id': prior['id'] if prior else str(key), 'name': prior['name'] if prior else title,
        'metadata': {'category': category, 'rarity': rarity, 'series': series, 'version': '', 'unit': units.get(category, ''),
                     'scenes': prior['scenes'] if prior else ['research'] if category.startswith('blueprint-') else ['research', 'commission'], 'game_id': str(key),
                     'faction': faction, 'subtype': subtype, 'ship_id': ship_id, 'equipment_id': equipment_id, 'tier': tier}
    })

data = {
    'sources': sources,
    'items': sorted(options, key=lambda row: (row['metadata']['category'], row['name'], row['metadata']['game_id'])),
    'ships': sorted(ship_choices.values(), key=lambda row: (row['series'], row['name'])),
    'equipment': sorted(equip_choices.values(), key=lambda row: row['name']),
    'series': sorted({row['blueprint_version'] for row in blueprints.values() if isinstance(row, dict)}),
    'factions': sorted(set(nations.values())),
    'ship_types': sorted({row['type_name'] for row in ship_types.values() if isinstance(row, dict)}),
    'equipment_types': sorted({row.get('type_name2') or row['type_name'] for row in equip_types.values() if isinstance(row, dict)}),
    'tiers': sorted({row['metadata']['tier'] for row in options if row['metadata']['tier']})
}
if args.stdout:
    print('ITEM_OPTIONS_JSON=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')))
else:
    (root / 'src/data/item-options.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(options)} item choices, {len(ship_choices)} ships, {len(equip_choices)} equipment choices')
