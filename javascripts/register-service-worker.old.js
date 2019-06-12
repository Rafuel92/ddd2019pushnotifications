(function ($) {
  Drupal.behaviors.ddd2019ThemePushNotifications= {
    attach: function (context, settings) {
      (function () {
        'use strict';
        var analyticsId = settings.pushNotificationsAnalyticsId;
        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);

          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        /**** START register-sw ****/
        function registerServiceWorker() {
          navigator.serviceWorker.register('/service-worker.js').then(function() {
            return navigator.serviceWorker.ready;
          })
            .then(function(registration) {
              registration.pushManager.subscribe({userVisibleOnly: true}).then(function(sub) {
                (JSON.stringify({'analyticsId': analyticsId}));
              },function(error) {
                //alert(error);
                console.log('Error Post Message');
                console.log(error);
              });
              console.log('Service worker successfully registered.');
              return registration;

            })
            .catch(function(err) {
              console.error('Unable to register service worker.', err);
            });
        }
        /**** END register-sw ****/

        // This is just to make sample code eaier to read.
        // TODO: Move into a variable rather than register each time.
        function getSWRegistration() {
          return navigator.serviceWorker.register('/service-worker.js',{ scope: '/' })
        }

        /**** START request-permission ****/
        function askPermission() {
          return new Promise(function(resolve, reject) {
            const permissionResult = Notification.requestPermission(function(result) {
              resolve(result);
            });

            if (permissionResult) {
              permissionResult.then(resolve, reject);
            }
          })
            .then(function(permissionResult) {
              if (permissionResult !== 'granted') {
                throw new Error('We weren\'t granted permission.');
              }
            });
        }
        /**** END request-permission ****/

        /**
         * Using `Notification.permission` directly can be slow (locks on the main
         * thread). Using the permission API with a fallback to
         * `Notification.permission` is preferable.
         * @return {Promise<String>} Returns a promise that resolves to a notification
         * permission state string.
         */
        /**** START get-permission-state ****/
        function getNotificationPermissionState() {
          if (navigator.permissions) {
            return navigator.permissions.query({name: 'notifications'})
              .then(function(result) {
                return result.state;
              });
          }

          return new Promise(function(resolve) {
            resolve(Notification.permission);
          });
        }

        /**** START subscribe-user ****/
        function subscribeUserToPush() {
          return getSWRegistration()
            .then(function(registration) {
              const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                  'BFN_8Jjgkxq7sBZAN9d7x1ECzAyQNrX0ueIliDm--DQmuQJPaqP_3a1ZZGog_SgjiHXrkmzsHf4hca_MVEm5PE8' // chiave pubblica
                  // corrispondente chiave privata: 44Xcb3rHa2JRADlDrICeZjfZLujIpB50aUfYoSJYiJI
                )
              };

              return registration.pushManager.subscribe(subscribeOptions);
            })
            .then(function(pushSubscription) {
              console.info(pushSubscription);
              console.log('Received PushSubscription: ', JSON.stringify(pushSubscription));
              return pushSubscription;
            });
        }
        /**** END subscribe-user ****/

        function setUpPush() {
          console.info("setUpPush");
          return Promise.all([
            registerServiceWorker(),
            getNotificationPermissionState()
          ])
            .then(function(results) {
              const registration = results[0];
              const currentPermissionState = results[1];

              if (currentPermissionState === 'denied') {
                console.info('The notification permission has been blocked. Nothing we can do.');
                // pushCheckbox.disabled = true;
                return;
              }
              console.info("currentPermissionState: "+currentPermissionState);
              if (currentPermissionState !== 'granted') {
                let promiseChain = Promise.resolve();
                promiseChain = askPermission();
                promiseChain
                  .then(subscribeUserToPush)
                  .then(function(subscription) {
                    if (subscription) {
                      var ps = JSON.parse(JSON.stringify(subscription));
                      var pacchetto = {};
                      pacchetto.endpoint = ps.endpoint;
                      pacchetto.p256dh = ps.keys.p256dh;
                      pacchetto.auth = ps.keys.auth;
                      console.info("Pacchetto inviato a db via REST");
                      console.info(pacchetto);
                      var $ = jQuery.noConflict();
                      $.ajax({
                        url : "/rest/subscription",
                        method: "POST",
                        data: JSON.stringify(pacchetto),
                        headers: {
                          "Accept": "application/json",
                          "Content-Type": "application/json"
                        },
                        success : function (data, status, xhr) {
                          console.info("Sottoscrizione memorizzata correttamente.");
                        },
                        error : function (richiesta,stato,errori) {
                          console.info("E' avvenuto un errore. Stato della chiamata: "+stato);
                          console.info(richiesta);
                          console.info(errori);
                        }
                      });
                    }

                    return subscription;
                  })
                  .catch(function(err) {
                    console.error('Failed to subscribe the user.', err);
                  });

                if (typeof registration !== 'undefined') {
                  return registration.pushManager.getSubscription()
                    .then(function(subscription) {
                      // pushCheckbox.checked = subscription !== null;
                      // pushCheckbox.disabled = false;
                    });
                }
              }
            })
            .catch(function(err) {
              console.log('Unable to register the service worker: ' + err);
            });
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
        /**** END feature-detect ****/
        //se  banner home vetrina non procedo con il setUp delle notifiche
        if($(".widget-home").length <= 0) {
          // Push is supported.
          setUpPush();
        }
        // };
      })();
    }
  }
})(jQuery);
