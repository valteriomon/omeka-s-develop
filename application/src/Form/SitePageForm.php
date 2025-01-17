<?php
namespace Omeka\Form;

use Laminas\Form\Form;
use Omeka\Site\Theme\Theme;

class SitePageForm extends Form
{
    protected $currentTheme;

    public function init()
    {
        $this->setAttribute('id', 'site-page-form');

        $this->add([
            'name' => 'o:title',
            'type' => 'Text',
            'options' => [
                'label' => 'Title', // @translate
            ],
            'attributes' => [
                'id' => 'title',
                'required' => true,
            ],
        ]);
        $this->add([
            'name' => 'o:slug',
            'type' => 'Text',
            'options' => [
                'label' => 'URL slug', // @translate
            ],
            'attributes' => [
                'id' => 'slug',
                'required' => false,
            ],
        ]);
        if ($this->getOption('addPage')) {
            $this->add([
                'name' => 'add_to_navigation',
                'type' => 'Checkbox',
                'options' => [
                    'label' => 'Add to navigation', // @translate
                ],
                'attributes' => [
                    'id' => 'add_to_navigation',
                ],
            ]);
        }

        $inputFilter = $this->getInputFilter();
    }

    public function setCurrentTheme(Theme $currentTheme)
    {
        $this->currentTheme = $currentTheme;
    }
}
