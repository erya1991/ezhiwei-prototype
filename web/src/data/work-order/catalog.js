import { createEquipmentSeed, PROJECT, ORGANIZATIONS, PEOPLE } from '../equipmentInspectionSeed.js'
import { clone } from './common.js'

// This adapter never imports the equipment store: importing it can run data migrations.
export const EQUIPMENT_STORAGE_KEY = 'ezhiwei:equipment-inspection:v1:state'
const professionByCategory = {
  'cat-boiler': '暖通', 'cat-steam': '暖通', 'cat-heat-system': '暖通',
  'cat-compressor': '医用气体', 'cat-air-system': '医用气体', 'cat-air-pipe': '医用气体',
  'cat-cabinet': '供配电', 'cat-power-system': '供配电',
  'cat-hvac-group': '暖通', 'cat-hvac-unit': '暖通', 'cat-hvac-system': '暖通',
  'cat-door': '建筑设施', 'cat-water-system': '给排水', 'cat-fire-system': '消防'
}
export function readCatalog(storage = null) {
  let state, notice = ''
  try {
    const raw = storage?.getItem(EQUIPMENT_STORAGE_KEY)
    state = raw ? JSON.parse(raw) : createEquipmentSeed()
    if (state.schema !== 1 || !['assets', 'spaces', 'categories'].every(key => Array.isArray(state[key]))) throw new Error('schema')
  } catch {
    return { project: PROJECT, organizations: ORGANIZATIONS, people: PEOPLE, spaces: [], assets: [], notice: '设备空间本地资料无法读取，请在设备管理核对；原数据未修改。' }
  }
  const spaces = clone(state.spaces)
  const path = id => {
    const result = [], seen = new Set()
    let row = spaces.find(item => item.id === id)
    while (row && !seen.has(row.id)) { seen.add(row.id); result.unshift(row.name); row = spaces.find(item => item.id === row.parentId) }
    return result.join(' / ')
  }
  return {
    project: clone(PROJECT), organizations: clone(ORGANIZATIONS), people: clone(PEOPLE), notice,
    spaces: spaces.map(row => ({ ...row, label: path(row.id) })),
    assets: clone(state.assets).map(row => ({ ...row, profession: professionByCategory[row.categoryId] || '', spaceLabel: path(row.spaceId) }))
  }
}
