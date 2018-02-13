(function (factory) {
	window.AjaxPollingController = factory();
}(function factory() {
	var EVENT_NAME_DATA_RECEIVED = 'dataReceived';
	var EVENT_NAME_ERROR = 'error';

	function AjaxPollingController(initOptions) { // eslint-disable-line max-statements
		var eventListeners = {};
		eventListeners[EVENT_NAME_DATA_RECEIVED] = [];
		eventListeners[EVENT_NAME_ERROR] = [];

		var pollingIntervalInMilliSeconds = 60 * 1000;
		var apiURI = '';
		var shouldNotPollOnIntervalStart = false;




		var pollingIsActive = false;
		var intervalIsActive = false;
		var timerId = NaN;

		var isWaitingForNetwork = false;
		var accumulatedErrorsCount = 0;
		var continuousErrorsCount = 0;

		var lastKnownData = null;
		var lastKnownDataTimestamp = NaN;
		var lastKnownDataOutDatedDurationInSeconds = NaN; // 3600;

		this.config = config.bind(this);
		this.addEventListener = addEventListener.bind(this);
		this.removeEventListener = removeEventListener.bind(this);

		this.stopPolling = stopPolling.bind(this);
		this.startPolling = startPolling.bind(this);
		this.restartPolling = restartPolling.bind(this);

		init();

		function init() {
			config(initOptions);
		}

		function config(options) {
			options = options || {};
			apiURI = options.apiURI; // eslint-disable-line prefer-destructuring


			// Either NaN or Zero means stop polling
			// positive number is saved
			// negative number is ignored
			// non number value other than NaN is ignored
			if (isNaN(options.pollingIntervalInMilliSeconds)) {
				pollingIntervalInMilliSeconds = 0;
				stopPolling();
			} else {
				var newInterval = parseFloat(options.pollingIntervalInMilliSeconds);
				if (newInterval >= 0) {
					pollingIntervalInMilliSeconds = newInterval;

					if (newInterval === 0) {
						stopPolling();
					} else if (newInterval < 10) {
						console.warn('Are you sure you want to set an interval less than 0.01 seconds?');
					}
				}
			}


			if (typeof options.onDataRecieved === 'function') {
				addEventListener(
					EVENT_NAME_DATA_RECEIVED,
					options.onDataRecieved
				);
			}

			if (typeof options.onError === 'function') {
				addEventListener(
					EVENT_NAME_ERROR,
					options.onError
				);
			}
		}

		function lastKnownDataIsOutDated() {
			return (Date.now() - lastKnownDataTimestamp) >= (lastKnownDataOutDatedDurationInSeconds * 1000);
		}

		function addEventListener(eventName, listener) {
			var registeredListeners = eventListeners[eventName];
			if (! Array.isArray(registeredListeners)) {
				console.error('Unkown event name:', eventName);
			} else if (typeof listener !== 'function') {
				console.error('Invalid listener. A valid listener must be a function.');
			} else {
				var foundListenerIndex = registeredListeners.indexOf(listener);
				if (foundListenerIndex < 0) {
					registeredListeners.push(listener);

					if (eventName === EVENT_NAME_DATA_RECEIVED && ! lastKnownDataIsOutDated()) {
						emitOneDataReceivedEventForOneListener(listener, lastKnownData);
					}
				}
			}
		}

		function removeEventListener(eventName, listener) {
			var registeredListeners = eventListeners[eventName];
			if (! Array.isArray(registeredListeners)) {
				console.error('Unkown event name:', eventName);
			} else {
				if (! listener) {
					eventListeners[eventName] = '';
				} else {
					var foundListenerIndex = registeredListeners.indexOf(listener);
					if (foundListenerIndex > -1) {
						registeredListeners.splice(foundListenerIndex, 1);
					}
				}
			}
		}

		function _pausePolling() {
			if (intervalIsActive) {
				clearTimeout(timerId);
				timerId = NaN;
				intervalIsActive = false;
			}
		}

		function stopPolling() {
			_pausePolling();
			pollingIsActive = false;
		}

		function startPolling() {
			var pollingWasNotActive = ! pollingIsActive;
			if (! intervalIsActive && pollingIntervalInMilliSeconds > 0) {
				timerId = setTimeout(executeTimedAction, pollingIntervalInMilliSeconds);
				intervalIsActive = true;
				pollingIsActive = true;
				if (pollingWasNotActive && ! shouldNotPollOnIntervalStart) {
					executeTimedAction();
				}
			}
		}

		function restartPolling() {
			_pausePolling();
			startPolling();
		}

		function executeTimedAction() {
			requestDataViaAJAX();
		}

		function requestDataViaAJAX() {
			if (isWaitingForNetwork) {
				console.warn('Another AJAX is already running');
			} else {
				isWaitingForNetwork = true;

				var xhr = new XMLHttpRequest();

				xhr.onreadystatechange = function () {
					if(xhr.readyState === XMLHttpRequest.DONE) {
						if (xhr.status === 200) {
							onNetworkDoneOnce(xhr.response);
						} else {
							onNetworkErrorOnce(xhr.response);
						}
					}
				};

				xhr.responseType = 'json';
				xhr.open('GET', apiURI, true);
				xhr.send();
			}
		}

		function onNetworkDoneOnce(data) {
			isWaitingForNetwork = false;
			lastKnownData = data;
			lastKnownDataTimestamp = Date.now();
			continuousErrorsCount = 0;
			broadcastEvent(EVENT_NAME_DATA_RECEIVED, data);
			restartPolling();
		}

		function onNetworkErrorOnce(error) {
			isWaitingForNetwork = false;
			accumulatedErrorsCount++;
			continuousErrorsCount++;
			broadcastEvent(EVENT_NAME_ERROR, error);
			restartPolling();
		}

		function emitOneDataReceivedEventForOneListener(listener, data) {
			listener(data);
		}

		function broadcastEvent(eventName, payload) {
			var listeners = eventListeners[eventName];

			if (Array.isArray(listeners)) {
				// 依照目前的逻辑，每当广播【收到数据】事件时，数据必定不是过期的。
				if (eventName === EVENT_NAME_DATA_RECEIVED /* && ! lastKnownDataIsOutDated() */) {
					listeners.forEach(function (listener) {
						emitOneDataReceivedEventForOneListener(listener, payload);
					});
				} else if (eventName === EVENT_NAME_ERROR) {
					listeners.forEach(function (listener) {
						listener(payload, continuousErrorsCount, accumulatedErrorsCount);
					});
				} else {
					listeners.forEach(function (listener) {
						listener(payload);
					});
				}
			}
		}
	}

	AjaxPollingController.EVENT_NAME_DATA_RECEIVED  = EVENT_NAME_DATA_RECEIVED;
	AjaxPollingController.EVENT_NAME_ERROR          = EVENT_NAME_ERROR;

	return AjaxPollingController;
}));