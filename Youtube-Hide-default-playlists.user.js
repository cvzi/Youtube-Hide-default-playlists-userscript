// ==UserScript==
// @name         Youtube - Hide default playlists
// @description  Hide the default playlists in the navigation on the left side of Youtube
// @version      1.1
// @namespace    https://openuserjs.org/users/cuzi
// @author       cuzi
// @copyright    2020, cuzi (https://openuserjs.org/users/cuzi)
// @icon         https://www.youtube.com/s/desktop/b4620429/img/favicon_144.png
// @license      MIT
// @match        https://www.youtube.com/*
// @grant        GM.registerMenuCommand
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

/* globals GM  */
(function () {
  'use strict'

  let hide = ['history', 'your_videos', 'watch_later', 'liked_videos']
  let alwaysShowMore = false
  let sortingEnabled = false
  const icons = {
    history: 'M11.75c-4-8.7-8.25H.92l3.57.133-3H5c0',
    your_videos: 'M18.6v12H5V5h12zm0-1H5a1.8000-1.8v12',
    watch_later: 'M123c-4-8.75-8.33s3.338.338-3.33-8S16.67123zm3.8',
    liked_videos: 'M3.75h3v-9h-3v9zm16-8c0-.83-.68-1-1-1h-4l.7-3.03-.24c0-.3-.13-.6-.33-.',
    show_more: 'M16.59L1213.418l666-6z',
    show_less: 'M128l-661.41L1210l4.58L1814z',
    custom_playlist: 'M3.67h14V11h-14V8zm0-4h14v2h-1'
  }
  const allAvailable = ['library', 'history', 'your_videos', 'watch_later', 'liked_videos']
  const titles = { library: 'Library' }
  let showReloadAlready = false
  let firstRun = true
  let firstRunSorting = true

  function getPlaylistType (icon) {
    const s = icon.querySelector('path').getAttribute('d').replace(/\s+/g, '').replace(/(\d+)\.\d+/g, '$1')
    for (const key in icons) {
      if (s.startsWith(icons[key])) {
        return key
      }
    }
    return 'custom_unknown_playlist:' + s
  }

  function parentQuery (node, q) {
    const parents = [node.parentElement]
    node = node.parentElement.parentElement
    while (node) {
      const lst = node.querySelectorAll(q)
      for (let i = 0; i < lst.length; i++) {
        if (parents.indexOf(lst[i]) !== -1) {
          return lst[i]
        }
      }
      parents.push(node)
      node = node.parentElement
    }
    return null
  }

  function loadHide () {
    return Promise.all([
      GM.getValue('hide', hide.join(',')),
      GM.getValue('alwaysShowMore', alwaysShowMore),
      GM.getValue('sortingEnabled', sortingEnabled)
    ]).then(function allPromisesLoaded (values) {
      hide = values[0].split(',')
      alwaysShowMore = values[1]
      sortingEnabled = values[2]
    })
  }

  function toggleHidePlaylist (type, yes) {
    return loadHide().then(function () {
      if (yes && hide.indexOf(type) === -1) {
        hide.push(type)
      } else if (!yes) {
        hide = hide.filter(t => t !== type)
      }
      return GM.setValue('hide', hide.join(','))
    })
  }

  function toggleAlwaysShowMore (yes) {
    alwaysShowMore = !!yes
    return GM.setValue('alwaysShowMore', alwaysShowMore)
  }

  function toggleSorting (yes) {
    sortingEnabled = !!yes
    return GM.setValue('sortingEnabled', sortingEnabled)
  }

  function showReload () {
    if (showReloadAlready) {
      return
    }
    showReloadAlready = true
    GM.registerMenuCommand('\uD83D\uDD04 Reload to see changes', () => document.location.reload())
  }

  function hidePlaylists () {
    const headerLibraryA = document.querySelector('#sections ytd-guide-collapsible-section-entry-renderer #header a[href="/feed/library"]')
    if (headerLibraryA) {
      if (hide.indexOf('library') !== -1) {
        parentQuery(headerLibraryA, '#header').style.display = 'none'
      }
      const sectionEntryRenderer = parentQuery(headerLibraryA, 'ytd-guide-collapsible-section-entry-renderer')
      sectionEntryRenderer.querySelectorAll('#section-items ytd-guide-entry-renderer').forEach(function (entryRenderer) {
        const type = getPlaylistType(entryRenderer)
        if (!(type in titles)) {
          titles[type] = entryRenderer.textContent.trim()
        }
        if (hide.indexOf(type) !== -1) {
          entryRenderer.remove()
        }
        if ((type === 'show_more' || type === 'show_less') && !('addedClick' in entryRenderer.dataset)) {
          entryRenderer.dataset.addedClick = 'yes'
          entryRenderer.addEventListener('click', function () {
            window.setTimeout(hidePlaylists, 50)
            window.setTimeout(hidePlaylists, 250)
            window.setTimeout(hidePlaylists, 500)
          })
        }
        if (type === 'show_more' && alwaysShowMore && !('alwaysOpened' in entryRenderer.dataset)) {
          entryRenderer.dataset.alwaysOpened = 'yes'
          entryRenderer.click()
        }
      })
      if (firstRun) {
        // Show config
        firstRun = false
        for (let i = 0; i < allAvailable.length; i++) {
          const type = allAvailable[i]
          if (type.startsWith('custom_') || type.startsWith('show_')) {
            continue
          }
          const title = type in titles ? titles[type] : type
          if (hide.indexOf(type) === -1) {
            GM.registerMenuCommand('Hide ' + title, () => toggleHidePlaylist(type, true).then(showReload))
          } else {
            GM.registerMenuCommand('Show ' + title, () => toggleHidePlaylist(type, false).then(showReload))
          }
        }
        if (alwaysShowMore) {
          GM.registerMenuCommand('Disable "Always show more"', () => toggleAlwaysShowMore(false).then(showReload))
        } else {
          GM.registerMenuCommand('Enable "Always show more"', () => toggleAlwaysShowMore(true).then(showReload))
        }
      }
    }
  }

  function sortPlaylists () {
    if (firstRunSorting) {
      if (sortingEnabled) {
        GM.registerMenuCommand('Disable "Sort playlists"', () => toggleSorting(false).then(showReload))
      } else {
        GM.registerMenuCommand('Enable "Sort playlists"', () => toggleSorting(true).then(showReload))
      }
      firstRunSorting = false
    }

    if (!sortingEnabled) {
      return
    }

    const headerLibraryA = document.querySelector('#sections ytd-guide-collapsible-section-entry-renderer #header a[href="/feed/library"]')
    if (headerLibraryA) {
      const sectionEntryRenderer = parentQuery(headerLibraryA, 'ytd-guide-collapsible-section-entry-renderer')
      const entries = []
      let showMore = null
      sectionEntryRenderer.querySelectorAll('#section-items ytd-guide-entry-renderer').forEach(function (entryRenderer) {
        const type = getPlaylistType(entryRenderer)
        if (type.startsWith('custom_')) {
          const titleNode = entryRenderer.querySelector('.title')
          if (titleNode && titleNode.textContent) {
            const title = titleNode.textContent.toLowerCase().replace(/\d+/gm, s => s.padStart(10, '0'))
            entries.push({ entryRenderer: entryRenderer, title: title })
          }
        } else if (type === 'show_more') {
          showMore = entryRenderer
        }
      })
      entries.sort((a, b) => a.title.localeCompare(b.title))
      entries.forEach(function (entry) {
        entries[0].entryRenderer.parentNode.appendChild(entry.entryRenderer)
      })
      if (showMore) {
        showMore.parentNode.parentNode.appendChild(showMore.parentNode)
      }
    }
  }

  loadHide().then(function () {
    hidePlaylists()
    window.setTimeout(hidePlaylists, 200)
    window.setInterval(hidePlaylists, 1000)
    sortPlaylists()
    if (sortingEnabled) {
      window.setInterval(sortPlaylists, 3000)
    } else {
      window.setInterval(sortPlaylists, 30000)
    }
  })
})()
