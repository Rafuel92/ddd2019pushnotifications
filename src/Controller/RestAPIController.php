<?php

namespace Drupal\ddd_2019_push_notifications\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Drupal\Component\Serialization\Json;

class RestAPIController extends ControllerBase {

  /**
   * Callback for 'rest/subscription' API method (POST).
   */
  public function saveSubscription(Request $request) {
	// Variables.
  $data = Json::decode($request->getContent());
	$now = time();
	$database = \Drupal::database();

	// Insert if record is not present.
  $results = $database->select('push_subscriptions', 'pn')
    ->condition('pn.endpoint', $data['endpoint'])
    ->condition('pn.p256dh', $data['p256dh'])
    ->condition('pn.auth', $data['auth'])
    ->countQuery()
    ->execute()
    ->fetchColumn();

	if ($results == 0 || 1 == 1) {
//	  for ($n = 1; $n <10000; $n++) {
      $database->insert('push_subscriptions')
        ->fields([
          'data' => $now,
          'endpoint' => $data['endpoint'],
          'p256dh' => $data['p256dh'],
          'auth' => $data['auth']
        ])
        ->execute();
//    }
  }

	$response = "Endpoint '" . $data['endpoint'] . "' salvato correttamente!";
    return new JsonResponse($response);
  }
}
