<?php

namespace Drupal\ddd_2019_push_notifications\Plugin\QueueWorker;

use Drupal\Core\Queue\QueueWorkerBase;

/**
 * Processes Notifications for web push notifications.
 *
 * @QueueWorker(
 *   id = "web_notifications_queue",
 *   title = @Translation("Web notifications queue"),
 *   cron = {"time" = 1200}
 * )
 */
class WebNotificationsQueue extends QueueWorkerBase {
  /**
   * {@inheritdoc}
   */
  public function processItem($data) {
    $handler = \Drupal::service('ddd_2019_push_notifications.handler');
    @$handler->sendSingleNotification($data);
  }
}
