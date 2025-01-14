import Engine, {
	formatValue,
	PublicodesExpression,
	Rule,
	RuleNode,
} from 'publicodes'

export function capitalise0(name: undefined): undefined
export function capitalise0(name: string): string
export function capitalise0(name?: string) {
	return name && name[0].toUpperCase() + name.slice(1)
}

export const debounce = <T>(waitFor: number, fn: (...args: T[]) => void) => {
	let timeoutId: ReturnType<typeof setTimeout>

	return (...args: T[]) => {
		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => fn(...args), waitFor)
	}
}

export const fetcher = (url: RequestInfo) => fetch(url).then((r) => r.json())

export function inIframe(): boolean {
	try {
		return window.self !== window.top
	} catch (e) {
		return true
	}
}

export function softCatch<ArgType, ReturnType>(
	fn: (arg: ArgType) => ReturnType
): (arg: ArgType) => ReturnType | null {
	return function (...args) {
		try {
			return fn(...args)
		} catch (e) {
			// eslint-disable-next-line no-console
			console.warn(e)

			return null
		}
	}
}

export function getSessionStorage() {
	// In some browsers like Brave, even just reading the variable sessionStorage
	// is throwing an error in the iframe, so we can't do things if sessionStorage !== undefined
	// and we need to wrap it in a try { } catch { } logic
	try {
		return window.sessionStorage
	} catch (e) {
		return undefined
	}
}

export const currencyFormat = (language: string) => ({
	isCurrencyPrefixed: !!formatValue(12, { language, displayedUnit: '€' }).match(
		/^€/
	),
	thousandSeparator: formatValue(1000, { language }).charAt(1),
	decimalSeparator: formatValue(0.1, { language }).charAt(1),
})

export function hash(str: string): number {
	let hash = 0
	let chr
	for (let i = 0; i < str.length; i++) {
		chr = str.charCodeAt(i)
		hash = (hash << 5) - hash + chr
		hash |= 0 // Convert to 32bit integer
	}

	return hash
}

export function omit<T, K extends keyof T>(obj: T, key: K): Omit<T, K> {
	const { [key]: _ignore, ...returnObject } = obj

	return returnObject
}

// TODO: This is will be included in the ES spec soon. Remove our custom
// implementation and rely on browser native support and polyfill when it is
// available.
// https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/groupBy
// https://caniuse.com/?search=groupby
export function groupBy<E, G extends string>(
	arr: Array<E>,
	callback: (elm: E, index: number, array: Array<E>) => G
): Record<G, Array<E>> {
	return arr.reduce((result, item, currentIndex) => {
		const key = callback(item, currentIndex, arr)
		result[key] = result[key] || []
		result[key].push(item)

		return result
	}, {} as Record<G, Array<E>>)
}

export function isIterable<T>(obj: unknown): obj is Iterable<T> {
	return Symbol.iterator in Object(obj)
}

/**
 * Check if a key exists in the object and return its value or undefined,
 * usefull for type check
 * @param obj any object
 * @param key key to get value from object
 * @returns value or undefined
 */
export const getValueFrom = <
	T extends Record<string | number | symbol, unknown>,
	K extends string | number | symbol
>(
	obj: T,
	key: K
): Extract<T, { [k in K]?: unknown }>[K] | undefined =>
	key in obj ? obj[key] : undefined

const isMeta = <T>(rule: Rule): rule is Rule & { meta?: T } => 'meta' in rule

/**
 * Return typed meta property from a rule
 * @param rule
 * @param defaultValue
 * @returns
 */
export const getMeta = <T>(rule: Rule, defaultValue: T) =>
	(isMeta<T>(rule) ? getValueFrom(rule, 'meta') : null) ?? defaultValue

/**
 * Wraps each event function specified in eventsToWrap (default onPress) with an
 * asynchronous function that waits x ms before executing the original function
 * Use this function on button props to avoid ghost click after onPress event
 * See this issue https://github.com/betagouv/mon-entreprise/issues/1872
 * Maybe the next version of the react-spectrum will handle that natively (issue https://github.com/adobe/react-spectrum/issues/1513)
 * @param props
 * @param options ms (time of debounce) and eventsToWrap (array of events to wrap with debounce)
 * @returns props
 */
export const wrapperDebounceEvents = <T>(
	props: T,
	{ ms = 25, eventsToWrap = ['onPress'] } = {}
): T => {
	if (props && typeof props === 'object') {
		const castedProps = props as Record<string, unknown>

		eventsToWrap.forEach((event: string) => {
			if (event in castedProps) {
				const original = castedProps[event]

				if (typeof original === 'function') {
					const debouncedFunction = async (...params: unknown[]) => {
						await new Promise((resolve) =>
							setTimeout(() => resolve(original(...params)), ms)
						)
					}

					castedProps[event] = debouncedFunction
				}
			}
		})
	}

	return props
}

/**
 * Return git branch name
 * @returns string
 */
export const getBranch = () => {
	let branch: string | undefined = import.meta.env.VITE_GITHUB_REF?.split(
		'/'
	)?.slice(-1)?.[0]

	if (branch === 'merge') {
		branch = import.meta.env.VITE_GITHUB_HEAD_REF
	}

	return branch ?? ''
}

/**
 * We use this function to hide some features in production while keeping them
 * in feature-branches. In case we do A/B testing with several branches served
 * in production, we should add the public faced branch names in the test below.
 * This is different from the import.meta.env.MODE in that a feature branch may
 * be build in production mode (with the NODE_ENV) but we may still want to show
 * or hide some features.
 * @returns boolean
 */
export const isProduction = () => {
	return import.meta.env.PROD && ['master', 'next'].includes(getBranch())
}

/**
 * Is a feature branche
 * @returns boolean
 */
export const isStaging = () => {
	return import.meta.env.PROD && !isProduction()
}

export const isDevelopment = () => {
	return import.meta.env.DEV
}

export async function getIframeOffset(): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const returnOffset = (evt: MessageEvent) => {
			if (evt.data.kind !== 'offset') {
				return
			}
			window.removeEventListener('message', returnOffset)
			resolve(evt.data.value)
		}
		if (!window.parent.postMessage) {
			reject(new Error('No parent window'))
		}
		window.parent?.postMessage({ kind: 'get-offset' }, '*')
		window.addEventListener('message', returnOffset)
	})
}

export function evaluateQuestion(
	engine: Engine,
	rule: RuleNode
): string | undefined {
	const question = rule.rawNode.question as Exclude<
		number,
		PublicodesExpression
	>
	if (question && typeof question === 'object') {
		return engine.evaluate(question as PublicodesExpression).nodeValue as string
	}

	return question
}
