/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseButton from '../BaseButton.vue'

test('renders slot content and default classes', () => {
  const wrapper = mount(BaseButton, { slots: { default: 'Click' } })
  const btn = wrapper.get('button')
  expect(btn.text()).toBe('Click')
  expect(btn.classes()).toContain('base-button')
  expect(btn.classes()).toContain('variant-primary')
})

test('applies variant class and disabled attr', () => {
  const wrapper = mount(BaseButton, { props: { variant: 'danger', disabled: true }, slots: { default: 'Del' } })
  const btn = wrapper.get('button')
  expect(btn.classes()).toContain('variant-danger')
  expect(btn.attributes('disabled')).toBeDefined()
})

test('sets button type', () => {
  const wrapper = mount(BaseButton, { props: { type: 'submit' }, slots: { default: 'Go' } })
  expect(wrapper.get('button').attributes('type')).toBe('submit')
})


