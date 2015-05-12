<?php
namespace Omeka;

use Omeka\Event\Event as OmekaEvent;
use Omeka\Module\AbstractModule;
use Zend\EventManager\Event;
use Zend\EventManager\SharedEventManagerInterface;
use Zend\Mvc\MvcEvent;

/**
 * The Omeka module.
 */
class Module extends AbstractModule
{
    /**
     * This Omeka version.
     */
    const VERSION = '0.1.23';

    /**
     * @var array View helpers that need service manager injection
     */
    protected $viewHelpers = array(
        'api'        => 'Omeka\View\Helper\Api',
        'assetUrl'   => 'Omeka\View\Helper\AssetUrl',
        'i18n'       => 'Omeka\View\Helper\I18n',
        'media'      => 'Omeka\View\Helper\Media',
        'pagination' => 'Omeka\View\Helper\Pagination',
        'trigger'    => 'Omeka\View\Helper\Trigger',
        'userIsAllowed' => 'Omeka\View\Helper\UserIsAllowed',
    );

    /**
     * {@inheritDoc}
     */
    public function onBootstrap(MvcEvent $event)
    {
        parent::onBootstrap($event);

        $serviceManager = $this->getServiceLocator();
        $viewHelperManager = $serviceManager->get('ViewHelperManager');

        // Inject the service manager into view helpers that need it.
        foreach ($this->viewHelpers as $helperName => $helperClass) {
            $viewHelperManager->setFactory($helperName,
                function ($helperPluginManager) use ($helperClass, $serviceManager) {
                    return new $helperClass($serviceManager);
                });
        }

        // Set the ACL to navigation.
        $acl = $serviceManager->get('Omeka\Acl');
        $navigation = $viewHelperManager->get('Navigation');
        $navigation->setAcl($acl);
    }

    /**
     * {@inheritDoc}
     */
    public function getConfig()
    {
        return array_merge(
            include __DIR__ . '/config/module.config.php',
            include __DIR__ . '/config/routes.config.php',
            include __DIR__ . '/config/navigation.config.php'
        );
    }

    /**
     * {@inheritDoc}
     */
    public function attachListeners(
        SharedEventManagerInterface $sharedEventManager,
        SharedEventManagerInterface $filterManager
    ) {
        $sharedEventManager->attach(
            'Zend\View\Helper\Navigation\AbstractHelper',
            'isAllowed',
            array($this, 'navigationPageIsAllowed')
        );

        $sharedEventManager->attach(
            'Omeka\Entity\Media',
            OmekaEvent::ENTITY_REMOVE_POST,
            array($this, 'deleteMediaFiles')
        );

        $sharedEventManager->attach(
            array(
                'Omeka\Api\Adapter\ItemAdapter',
                'Omeka\Api\Adapter\ItemSetAdapter',
                'Omeka\Api\Adapter\MediaAdapter',
            ),
            OmekaEvent::API_SEARCH_QUERY,
            array($this, 'filterSearchResults')
        );
    }

    /**
     * Determine whether a navigation page is allowed.
     *
     * @param Event $event
     * @return bool
     */
    public function navigationPageIsAllowed(Event $event)
    {
        $accepted = true;
        $params   = $event->getParams();
        $acl      = $params['acl'];
        $page     = $params['page'];

        if (!$acl) {
            return $accepted;
        }

        $resource  = $page->getResource();
        $privilege = $page->getPrivilege();

        if ($resource || $privilege) {
            $accepted = $acl->hasResource($resource)
                && $acl->userIsAllowed($resource, $privilege);
        }

        $event->stopPropagation();
        return $accepted;
    }

    /**
     * Delete all files associated with a removed Media entity.
     *
     * @param Event $event
     */
    public function deleteMediaFiles(Event $event)
    {
        $fileManager = $this->getServiceLocator()->get('Omeka\File\Manager');
        $media = $event->getTarget();

        if ($media->hasOriginal()) {
            $fileManager->deleteOriginal($media);
        }

        if ($media->hasThumbnails()) {
            $fileManager->deleteThumbnails($media);
       }
    }

    /**
     * Filter search results by owner and visibility.
     *
     * @param Event $event
     */
    public function filterSearchResults(Event $event)
    {
        $identity = $this->getServiceLocator()
            ->get('Omeka\AuthenticationService')->getIdentity();
        if ($identity && 'global_admin' == $identity->getRole()) {
            return;
        }

        $adapter = $event->getTarget();
        $entityClass = $adapter->getEntityClass();
        $qb = $event->getParam('queryBuilder');
        $qb->andWhere($qb->expr()->orX(
            $qb->expr()->eq("$entityClass.owner", $identity->getId()),
            $qb->expr()->eq("$entityClass.isPublic", true)
        ));
    }
}
