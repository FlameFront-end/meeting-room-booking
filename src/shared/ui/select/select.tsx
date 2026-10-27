'use client'

import clsx from 'clsx'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'

import { Icon, type IconName } from '../icon/icon'
import { useAnchoredPopover } from '../popover/use-anchored-popover'

import styles from './select.module.scss'

export type SelectOption<T extends string = string> = {
	value: T
	/** Текст пункта; по умолчанию — само значение. */
	label?: string
	disabled?: boolean
}

type SelectProps<T extends string> = {
	value: T
	options: readonly SelectOption<T>[]
	onChange: (value: T) => void
	onBlur?: () => void
	id?: string
	ref?: Ref<HTMLButtonElement>
	disabled?: boolean
	icon?: IconName
	'aria-labelledby'?: string
	'aria-describedby'?: string | undefined
	'aria-invalid'?: boolean
}

const TYPEAHEAD_RESET_MS = 600

const labelOf = (option: SelectOption) => option.label ?? option.value

/**
 * Выпадающий список по паттерну WAI-ARIA «select-only combobox».
 * Фокус всегда остаётся на кнопке, активный пункт передаётся через aria-activedescendant —
 * так скринридер объявляет пункты, а Tab и форма ведут себя как с обычным полем.
 *
 * Клавиатура: ↑/↓ открывают список и двигают выбор, Home/End — к краям, Enter/Пробел выбирают,
 * Esc закрывает (не закрывая модальное окно вокруг), набор символов прыгает к пункту: «14» → 14:00.
 */
export const Select = <T extends string>({
	value,
	options,
	onChange,
	onBlur,
	id,
	ref,
	disabled = false,
	icon,
	...aria
}: SelectProps<T>) => {
	const listId = useId()
	const rootRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const listRef = useRef<HTMLUListElement>(null)
	const [isOpen, setIsOpen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(-1)
	const typeahead = useRef({ query: '', timer: 0 })

	const selectedIndex = options.findIndex(option => option.value === value)
	const selected = options[selectedIndex]
	const optionId = (index: number) => `${listId}-${index}`
	const isEnabled = (index: number) => options[index] !== undefined && !options[index].disabled

	const firstEnabled = () => options.findIndex(option => !option.disabled)
	const lastEnabled = () => options.findLastIndex(option => !option.disabled)

	/** Следующий доступный пункт в направлении step; у края остаёмся на месте. */
	const step = (from: number, direction: 1 | -1) => {
		for (let index = from + direction; index >= 0 && index < options.length; index += direction) {
			if (isEnabled(index)) return index
		}
		return from
	}

	const open = (index = isEnabled(selectedIndex) ? selectedIndex : firstEnabled()) => {
		setActiveIndex(index)
		setIsOpen(true)
	}

	const commit = (index: number) => {
		const option = options[index]
		if (!option || option.disabled) return
		onChange(option.value)
		setIsOpen(false)
	}

	const jumpByTypeahead = (char: string) => {
		const state = typeahead.current
		window.clearTimeout(state.timer)
		state.query += char.toLowerCase()
		state.timer = window.setTimeout(() => {
			state.query = ''
		}, TYPEAHEAD_RESET_MS)

		const match = options.findIndex(
			(option, index) => isEnabled(index) && labelOf(option).toLowerCase().startsWith(state.query)
		)
		if (match >= 0) open(match)
	}

	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		const { key } = event

		if (!isOpen) {
			if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
				event.preventDefault()
				open()
			} else if (key.length === 1 && !event.metaKey && !event.ctrlKey) {
				jumpByTypeahead(key)
			}
			return
		}

		switch (key) {
			case 'ArrowDown':
				event.preventDefault()
				setActiveIndex(index => step(index, 1))
				break
			case 'ArrowUp':
				event.preventDefault()
				setActiveIndex(index => step(index, -1))
				break
			case 'Home':
				event.preventDefault()
				setActiveIndex(firstEnabled())
				break
			case 'End':
				event.preventDefault()
				setActiveIndex(lastEnabled())
				break
			case 'Enter':
			case ' ':
				event.preventDefault()
				commit(activeIndex)
				break
			case 'Escape':
				// Иначе Esc закроет ещё и модальное окно, внутри которого стоит список
				event.preventDefault()
				event.stopPropagation()
				setIsOpen(false)
				break
			case 'Tab':
				setIsOpen(false)
				break
			default:
				if (key.length === 1 && !event.metaKey && !event.ctrlKey) jumpByTypeahead(key)
		}
	}

	// Список — в top layer поверх модалки, а не внутри её прокрутки
	useAnchoredPopover(isOpen, triggerRef, listRef, { matchWidth: true })

	// Активный пункт всегда в зоне видимости списка
	useEffect(() => {
		if (!isOpen || activeIndex < 0) return
		document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
	}, [isOpen, activeIndex, listId])

	// Клик мимо — закрыть
	useEffect(() => {
		if (!isOpen) return
		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
		}
		document.addEventListener('pointerdown', onPointerDown)
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [isOpen])

	return (
		<div ref={rootRef} className={styles.root}>
			<button
				ref={node => {
					triggerRef.current = node
					if (typeof ref === 'function') ref(node)
					else if (ref) ref.current = node
				}}
				id={id}
				type='button'
				role='combobox'
				className={styles.trigger}
				aria-haspopup='listbox'
				aria-expanded={isOpen}
				aria-controls={listId}
				aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
				aria-labelledby={aria['aria-labelledby']}
				aria-describedby={aria['aria-describedby']}
				aria-invalid={aria['aria-invalid'] ?? false}
				disabled={disabled}
				onClick={() => (isOpen ? setIsOpen(false) : open())}
				onKeyDown={onKeyDown}
				onBlur={() => {
					setIsOpen(false)
					onBlur?.()
				}}
			>
				{icon ? <Icon name={icon} className={styles.icon} /> : null}
				<span className={styles.value}>{selected ? labelOf(selected) : '—'}</span>
				<Icon name='chevron-down' className={clsx(styles.chevron, isOpen && styles.chevronOpen)} />
			</button>

			<ul
				ref={listRef}
				id={listId}
				role='listbox'
				popover='manual'
				className={styles.list}
				aria-labelledby={aria['aria-labelledby']}
				hidden={!isOpen}
				// Клик по пункту не должен уводить фокус с кнопки
				onMouseDown={event => event.preventDefault()}
			>
				{options.map((option, index) => (
					<li
						key={option.value}
						id={optionId(index)}
						role='option'
						aria-selected={index === selectedIndex}
						aria-disabled={option.disabled ?? undefined}
						className={clsx(
							styles.option,
							index === activeIndex && styles.active,
							index === selectedIndex && styles.selected
						)}
						onClick={() => commit(index)}
						onMouseMove={() => {
							if (isEnabled(index) && index !== activeIndex) setActiveIndex(index)
						}}
					>
						<span>{labelOf(option)}</span>
						{index === selectedIndex ? <Icon name='check' size={16} className={styles.check} /> : null}
					</li>
				))}
			</ul>
		</div>
	)
}
