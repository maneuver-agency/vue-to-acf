#!/usr/bin/env node

'use strict'

const fs = require('fs')
const yargs = require('yargs')
const jsonfile = require('jsonfile')
const Vuedoc = require('@vuedoc/parser')
const colors = require('colors/safe')
const { startsWith } = require('lodash')

const argv = yargs
  .command('parse', 'Parse a component', {
    component: {
      alias: 'c',
      description: 'The camel case name of the component to parse.',
      type: 'string',
      demandOption: true,
    },
  })
  .option('dir', {
    description:
      'The directory to search for components (w/o trailing slash). Defaults to current working directory.',
    type: 'string',
    default: '.',
  })
  .option('dest', {
    description:
      'The destination directory to save the json files to (w/o trailing slash). Defaults to ./acf-json.',
    type: 'string',
    default: './acf-json',
  })
  .help()
  .alias('help', 'h').argv

if (argv._.includes('parse')) {
  const filepath = `${argv.dir}/${argv.component}.vue`
  const jsondir = `${argv.dest}/`

  parseComponent(filepath, jsondir)
}

function parseComponent(vueFile, destFolder) {
  fs.readFile(vueFile, 'utf8', (err, data) => {
    if (err) {
      showError(`Error reading ${vueFile}. Does it exist?`)
    } else {
      Vuedoc.parse({ filename: vueFile })
        .then((component) => {
          const componentName = component.name
          const groupKey = `group_${componentName.toLowerCase()}_component`

          const fields = []

          for (const prop of component.props) {
            fields.push({
              key: `${groupKey}_${prop.name}`,
              ...getAcfFieldConfig(prop),
            })
          }

          const config = {
            key: groupKey,
            title: `Component: ${componentName}`,
            fields,
            label_placement: 'left',
            active: false,
            acfe_categories: { component: 'component' },
          }

          if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder)
          }

          const filename = `${destFolder}${groupKey}.json`
          jsonfile.writeFile(filename, config, { spaces: 2 }, function (err) {
            if (err) console.error(err)
            else console.log(colors.green(`${filename} created`))
          })
        })
        .catch((err) => showError(err))
    }
  })
}

function showError(message) {
  console.log(colors.red(message))
}

function snakeCaseToWords(string) {
  string = string.charAt(0).toUpperCase() + string.slice(1)
  return string.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

function getAcfFieldType(prop) {
  if (startsWith(prop.name, 'image')) {
    return 'image'
  }
  if (prop.name === 'button') {
    return 'acfe_advanced_link'
  }
  if (prop.name === 'body') {
    return 'wysiwyg'
  }
  if (
    prop.name === 'align' ||
    prop.name === 'halign' ||
    prop.name === 'valign' ||
    prop.name === 'text-align'
  ) {
    return 'button_group'
  }
  if (prop.name === 'buttons') {
    return 'repeater'
  }
  if (prop.name === 'images') {
    return 'gallery'
  }

  return {
    string: 'text',
    boolean: 'true_false',
    number: 'number',
    array: 'repeater',
  }[prop.type.toLowerCase()]
}

function getAcfFieldConfig(prop) {
  const name = prop.name
  const type = getAcfFieldType(prop)

  const config = {
    label: snakeCaseToWords(name),
    name,
    type,
  }
  let extra = {}

  if (type === 'wysiwyg') {
    extra = {
      tabs: 'visual',
      toolbar: 'simple',
      media_upload: 0,
      delay: 1,
    }
  }

  if (type === 'true_false') {
    extra = {
      ui: 1,
    }
  }

  if (type === 'image' || type === 'images') {
    extra = {
      return_format: 'array',
      preview_size: 'thumbnail',
    }
  }

  if (type === 'repeater') {
    extra = {
      layout: 'row',
    }
  }

  if (name === 'valign') {
    extra = {
      choices: {
        start: 'Top',
        center: 'Center',
        end: 'Bottom',
      },
    }
  }

  if (name === 'text-align' || name === 'halign' || name === 'align') {
    extra = {
      choices: {
        left: 'Left',
        center: 'Center',
        right: 'Right',
      },
    }
  }

  return { ...config, ...extra }
}
