/* @vitest-environment jsdom */
import { mount } from '@vue/test-utils'
import { test, expect } from 'vitest'
import BaseCard from '../BaseCard.vue'

test('renders default slot content', () => {
  const wrapper = mount(BaseCard, { slots: { default: '<p id="content">Hello</p>' } })
  expect(wrapper.find('#content').exists()).toBe(true)
})

test('renders named header slot when provided', () => {
  const wrapper = mount(BaseCard, {
    slots: {
      header: '<h2 id="hdr">Title</h2>',
      default: 'Body'
    }
  })
  expect(wrapper.find('.card-header #hdr').text()).toBe('Title')
})


