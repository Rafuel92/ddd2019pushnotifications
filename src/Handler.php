<?php

namespace Drupal\ddd_2019_push_notifications;

use Drupal\Core\Database\Connection;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Queue\QueueFactory;
use Drupal\Core\Url;
use Drupal\node\NodeInterface;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Drupal\Component\Serialization\Json;
use Drupal\image\Entity\ImageStyle;

require_once('ss-ga.class.php');

class Handler {

  /**
   * The database connection.
   *
   * @var \Drupal\Core\Database\Connection
   */
  protected $database;

  /**
   * The config factory.
   *
   * @var \Drupal\Core\Config\ConfigFactoryInterface
   */
  protected $configFactory;

  /**
   * The queue factory.
   *
   * @var \Drupal\Core\Queue\QueueInterface
   */
  protected $queueFactory;

  /**
   * @var int
   */
  protected $chunkNumber = 1000;

  /**
   * Constructs a new DatabaseProfilerStorage instance.
   *
   * @param \Drupal\Core\Database\Connection $database
   *   The database connection.
   */
  function __construct(Connection $database, ConfigFactoryInterface $config_factory, QueueFactory $queue_factory) {
    $this->database = $database;
    $this->configFactory = $config_factory;
    $this->queueFactory = $queue_factory;
  }

  /**
   * Start send push notifications.
   *
   * @param \Drupal\node\NodeInterface $node
   *
   * @throws \ErrorException
   */
  public function send(NodeInterface $node) {
    // Variables.
    $config = $this->configFactory->get('ddd_2019_push_notifications');

    // Query, get all subscribers.
    $results = \Drupal::database()->select('push_subscriptions', 'ps')
      ->fields('ps')
      ->execute();
    $subscriptions = $results->fetchAllAssoc('endpoint');


    $validSubscriptions = \Drupal::database()->query("SELECT DISTINCT(endpoint) FROM {push_subscriptions}")->fetchAll();

    $subscriptionsDef = array();
    foreach($validSubscriptions as $k => $v){
      if(isset($subscriptions[$v->endpoint])){
        $v1 = $subscriptions[$v->endpoint];
        $obj = new \StdClass();
        $obj->id = $v1->id;
        $obj->data = $v1->data;
        $obj->endpoint = $v1->endpoint;
        $obj->auth = $v1->auth;
        $obj->p256dh = $v1->p256dh;
        $subscriptionsDef[] = $obj;
      }
    }

    $subscriptions = $subscriptionsDef;


    $resultsCount = count($subscriptions);

    // Subscribers chunk.
    $subscriptions = array_chunk($subscriptions, $this->chunkNumber);

    // Create queue.
    $queue = $this->queueFactory->get('web_notifications_queue');
    $queue->createQueue();

    // Loop subscribers.
    foreach ($subscriptions as $subscribersChunk) {
      // Set data.
      $data = [
        'node' => $node,
        'subscribers' => $subscribersChunk
      ];

      // Add in queue.
//      $this->sendSingleNotification($data);
      $queue->createItem($data);
    }

    // Sent event GA.
    $codiceAnalytics = $node->field_analytics_code->value;

    /*$analyticsId = $config->get('analytics_id');
    $ssga = new \ssga($analyticsId, 'mydomain.eu');
    $ssga->set_event('Notifiche_push', $codiceAnalytics, 'notification-number', $resultsCount);
    $ssga->send();*/
  }

  /**
   * @param $data
   *
   * @throws \ErrorException
   */
  public function sendSingleNotification($data) {
    // Set variables.
    $config = $this->configFactory->get('ddd_2019_push_notifications');
    $node = $data['node'];
    $subscribers = $data['subscribers'];

    // Set array auth.
    $auth = $config->get('auth_web_notifications');

    // Create instance class WebPush.
    $webPush = new WebPush($auth);
    $payload =  new \stdClass();

    // Set notification.
    $payload->title = $node->getTitle();
    $payload->analytics_code = str_replace(' ','+', $node->field_analytics_code->value);
    $payload->body = $node->field_description->value;

    // Set image.
    if($node->field_icon->entity !== null){
      $imageUri = $node->field_icon->entity->getFileUri();

      // Set imagestyle for file not svg.
      $imageName = file_create_url($imageUri);
      $imageExt = pathinfo($imageName)['extension'];
      if($imageExt !== 'svg'){
        $imageUrl = ImageStyle::load('push_notification')->buildUrl($imageUri);
      } else {
        // Svg image.
        $imageUrl = Url::fromUri($imageUri)->toString();
      }
    } else {
      // Set default image drupal dev days
      $imageUrl = 'https://pbs.twimg.com/profile_images/1057679778294218752/tuJwojG6_400x400.jpg';
    }

    // Add icon.
    $payload->icon = $imageUrl;

    // Set endpoint.
    $payload->data = Url::fromUri($node->field_url->getString())->setAbsolute()->toString();

    // Send notification.
    foreach ($subscribers as $subscriber) {
        $webPush->sendNotification(
          Subscription::create([
            'endpoint' => $subscriber->endpoint,
            'keys' => ['p256dh' => $subscriber->p256dh, 'auth' => $subscriber->auth]
          ]),
          Json::encode($payload)
        );

      // Delete subscription if return an error.
      $flush = $webPush->flush();
      foreach($webPush->flush() as $report){
        //this is the place for getting feedback from single endpoint with $report->getResponse()
      }
      if (is_array($flush) && isset($flush[0]['success']) && !$flush[0]['success']) {
        // Delete subscription.
        $this->database->delete('push_subscriptions')
          ->condition('id', $subscriber->id)
          ->execute();
      }
    }
  }

  /**
   * @return int
   */
  public function countSubscribers() {
    // Query, get all subscribers.
    $results = $this->database->select('push_subscriptions', 'ps')
      ->fields('ps')
      ->execute();
    $subscriptions = $results->fetchAll();
    $resultsCount = count($subscriptions);

    return $resultsCount;
  }

  /**
   * @return mixed
   */
  public function countPendingNotifications() {
    // Create queue.
    $queue = $this->queueFactory->get('web_notifications_queue');
    $queue->createQueue();

    return $queue->numberOfItems() * $this->chunkNumber;
  }

  /**
   * @return mixed
   */
  public function chunkNumber() {

    return $this->chunkNumber;
  }
}
