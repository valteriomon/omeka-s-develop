<?php
namespace Omeka\Controller\Admin;

use Laminas\View\Model\ViewModel;
use Laminas\Mvc\Controller\AbstractActionController;

class QueryController extends AbstractActionController
{
    public function sidebarEditAction()
    {
        switch ($this->params()->fromQuery('query_resource_type')) {
            case 'media':
                $resourceType = 'media';
                break;
            case 'item_sets':
                $resourceType = 'item_set';
                break;
            default:
                $resourceType = 'item';
        }
        $view = new ViewModel;
        $view->setTerminal(true);
        $view->setVariable('resourceType', $resourceType);
        return $view;
    }

    public function sidebarPreviewAction()
    {
        switch ($this->params()->fromQuery('query_resource_type')) {
            case 'media':
                $resourceType = 'media';
                break;
            case 'item_sets':
                $resourceType = 'item_sets';
                break;
            default:
                $resourceType = 'items';
        }
        $this->setBrowseDefaults('created');
        $response = $this->api()->search($resourceType, $this->params()->fromQuery());
        $this->paginator($response->getTotalResults());

        $view = new ViewModel;
        $view->setTerminal(true);
        $view->setVariable('resources', $response->getContent());
        return $view;
    }
}
