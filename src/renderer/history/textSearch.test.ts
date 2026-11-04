import { describe, expect, it } from 'vitest'
import { containsAllWords, searchWords } from './textSearch'

const recipe = 'Ingrédients\n250 g de farine\n4 œufs\n1 sachet de sucre vanillé'

describe('searchWords', () => {
  it('splits the query and drops accents and capitals', () => {
    expect(searchWords('  Sucre   VANILLÉ ')).toEqual(['sucre', 'vanille'])
    expect(searchWords('   ')).toEqual([])
  })
})

describe('containsAllWords', () => {
  it('finds text whatever the accents, capitals or line breaks', () => {
    expect(containsAllWords(recipe, searchWords('ingredients'))).toBe(true)
    expect(containsAllWords(recipe, searchWords('de farine 4'))).toBe(true)
  })

  it('needs every word of the query', () => {
    expect(containsAllWords(recipe, searchWords('farine chocolat'))).toBe(false)
  })

  it('matches the start of a word as you type', () => {
    expect(containsAllWords(recipe, searchWords('vanil'))).toBe(true)
  })
})
