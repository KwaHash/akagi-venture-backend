import { load } from 'js-yaml'
import { readFileSync } from 'fs'

const system = load(readFileSync('./data/master/system.yaml', 'utf8'))
const bacon = load(readFileSync('./data/master/bacon.yaml', 'utf8'))
const irregular = load(readFileSync('./data/master/irregular.yaml', 'utf8'))

export default {
  system,
  bacon,
  irregular,
}
