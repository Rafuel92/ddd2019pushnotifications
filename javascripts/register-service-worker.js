(function ($) {
  Drupal.behaviors.ddd2019PushNotificationsRegisterServiceWorker = {
    attach: function (context, settings) {
      (function () {
        'use strict';

        // Disable console log.
        // console.log = function() {};
        // console.info = function() {};

        // Variables.
        var analyticsId = settings.pushNotificationsAnalyticsId;
        var serviceWorkerRegistration;

        if ('serviceWorker' in navigator) {
          // if (navigator.serviceWorker.controller) {
          //   navigator.serviceWorker.controller.postMessage({'analyticsId': analyticsId});
          // } else {
          //   console.log('Error postMessage');
          // }

          $('.page-title').bind('click', function () {
            serviceWorkerRegistration = registerServiceWorker();
          });
        }

        function registerServiceWorker() {
          return navigator.serviceWorker.register('/service-worker.js?gaId=' + analyticsId + '&v=3')
            .then(function (registration) {
              console.log(registration);
              registration.update();
              console.log(navigator.serviceWorker);
              console.log('Service worker successfully registered.');
              askPermission(); //register using Notifications API
              return registration;
            })
            .catch(function (err) {
              console.log(JSON.stringify(err));
              console.error('Unable to register service worker.', err);
            });
        }

        function askPermission() {
          return new Promise(function (resolve, reject) {
            const permissionResult = Notification.requestPermission(function (result) {
              resolve(result);
            });

            if (permissionResult) {
              permissionResult.then(resolve, reject);
            }
          })
            .then(function (permissionResult) {
              if (permissionResult !== 'granted') {
                throw new Error('We weren\'t granted permission.');
              } else {
                subscribeUserToPush();
              }
            });
        }

        function subscribeUserToPush() {
          return serviceWorkerRegistration
            .then(function (registration) { //object obtained after the successful registration of the service worker
              //console.log('BAQjO-w7WMm90sFFLDqyJQ6oAUgX07fnZWiwGkoRAeS1u48HtkXk7Yk9u0d-65lI93N3uHjedd_WmQ5Kib1o5oM');
              const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array('BAQjO-w7WMm90sFFLDqyJQ6oAUgX07fnZWiwGkoRAeS1u48HtkXk7Yk9u0d-65lI93N3uHjedd_WmQ5Kib1o5oM')
                // Generate public/private key from here https://web-push-codelab.appspot.com/
              };

              return registration.pushManager.subscribe(subscribeOptions);
            })
            .then(function (pushSubscription) {
              // Send pushSubscription to backend
              ajaxSendSubscription(pushSubscription);
              console.log('Received PushSubscription: ', JSON.stringify(pushSubscription));
              return pushSubscription;
            });
        }

        function ajaxSendSubscription (pushSubscription) {
          console.log(settings.pushNotificationsSubscriberRestPath);
          // Variables.
          var ps = JSON.parse(JSON.stringify(pushSubscription));
          console.log(ps);
          var payload = {};
          payload.endpoint = ps.endpoint;
          payload.p256dh = ps.keys.p256dh;
          payload.auth = ps.keys.auth;

          $.ajax({
            url : settings.pushNotificationsSubscriberRestPath,
            method: "POST",
            data: JSON.stringify(payload),
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            success : function (data, status, xhr) {
              console.log("Sottoscrizione memorizzata correttamente.");
            },
            error : function (data, status, errors) {
              console.log("E' avvenuto un errore. Stato della chiamata: " + status);
              console.log(data);
              console.log(errors);
            }
          });
        }

        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
          const rawData = window.atob(base64);
          return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
        }

        /**** START feature-detect ****/
        if (!('serviceWorker' in navigator)) {
          // Service Worker isn't supported on this browser, disable or hide UI.
          return;
        }

        if (!('PushManager' in window)) {
          // Push isn't supported on this browser, disable or hide UI.
          return;
        }
      })();
    }
  }
})(jQuery);
