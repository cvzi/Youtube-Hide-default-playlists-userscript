// ==UserScript==
// @name         Youtube - Hide default playlists
// @description  Hide the default playlists in the navigation on the left side of Youtube
// @version      1.3
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
    history: 'M14,16L10,13V7h2v5l4,2L14,16zM22,12c0,5-4',
    your_videos: 'M10,8l6,4l-6,4V8L10,8zM21,3v18H3V3H21zM20,4H4v16h16V4z',
    watch_later: 'M14,16L10,13V7h2v5l4,2L14,16zM12,3c-4,0-9,4-9,9s4,9,9,9s9-4,9-9S16,3,12',
    download: 'M1718V19H6V18H17ZM16.4L15.7L1214V4H11V14L7.6L6.3L11.3L16.4Z',
    liked_videos: 'M18,11h-4l1-4C16,5,15,4,14,4c-0,0-1,0-1,0L7,11H3v10h4h1h9c1',
    show_more: 'M12,15L5,9l0-0l5,5l5-5l0,0L12,15z',
    show_less: '18,14,8.6,14.4,15,9.6,15',
    custom_playlist: 'M22,7H2v1h20V7zM13,12H2v-1h11V12zM13,16H2v-1h11V16zM15,19v-8l7,4L15,19z'
  }
  const allAvailable = ['library', 'history', 'your_videos', 'watch_later', 'liked_videos']
  const titles = { library: 'Library' }
  let showReloadAlready = false
  let firstRun = true
  let firstRunSorting = true

  function getPlaylistType (icon) {
    if (icon.querySelector('path')) {
      const s = icon.querySelector('path').getAttribute('d').replace(/\s+/g, '').replace(/(\d+)\.\d+/g, '$1')
      for (const key in icons) {
        if (s.startsWith(icons[key])) {
          return key
        }
      }
      return 'custom_unknown_playlist:' + s
    } else if (icon.querySelector('polygon')) {
      const s = icon.querySelector('polygon').getAttribute('points').replace(/\s+/g, '').replace(/(\d+)\.\d+/g, '$1')
      for (const key in icons) {
        if (s.startsWith(icons[key])) {
          return key
        }
      }
      return 'custom_unknown_playlist:' + s
    } else {
      return 'unexpanded_section'
    }
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
    const headerLibraryA = document.querySelector('#guide-inner-content a[href="/feed/library"]')
    if (headerLibraryA) {
      if (hide.indexOf('library') !== -1) {
        parentQuery(headerLibraryA, '#guide-inner-content').style.display = 'none'
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
    if (document.hidden) {
      return
    }

    if (firstRunSorting) {
      firstRunSorting = false
      if (sortingEnabled) {
        GM.registerMenuCommand('Disable "Sort playlists"', () => toggleSorting(false).then(showReload))
      } else {
        GM.registerMenuCommand('Enable "Sort playlists"', () => toggleSorting(true).then(showReload))
        return
      }
    }

    const headerLibraryA = document.querySelector('#guide-inner-content a[href="/feed/library"]')
    if (headerLibraryA) {
      const sectionEntryRenderer = parentQuery(headerLibraryA, 'ytd-guide-collapsible-section-entry-renderer')
      const guideEntries = []
      let showMore = null
      sectionEntryRenderer.querySelectorAll('#section-items ytd-guide-entry-renderer').forEach(function (entryRenderer) {
        const type = getPlaylistType(entryRenderer)
        if (type.startsWith('custom_')) {
          const titleNode = entryRenderer.querySelector('.title')
          if (titleNode && titleNode.textContent) {
            const title = titleNode.textContent.toLowerCase().replace(/\d+/gm, s => s.padStart(10, '0'))
            guideEntries.push({ entryRenderer: entryRenderer, title: title })
          }
        } else if (type === 'show_more') {
          showMore = entryRenderer
        }
      })
      guideEntries.sort((a, b) => a.title.localeCompare(b.title))
      guideEntries.forEach(function (entry) {
        guideEntries[0].entryRenderer.parentNode.appendChild(entry.entryRenderer)
      })
      if (showMore) {
        showMore.parentNode.parentNode.appendChild(showMore.parentNode)
      }
    }

    if (document.querySelector('ytd-add-to-playlist-renderer ytd-playlist-add-to-option-renderer')) {
      const addToPlaylistEntries = []
      document.querySelectorAll('ytd-add-to-playlist-renderer ytd-playlist-add-to-option-renderer').forEach(function (renderer) {
        const title = renderer.querySelector('yt-formatted-string').textContent.toLowerCase().replace(/\d+/gm, s => s.padStart(10, '0'))
        addToPlaylistEntries.push({ entryRenderer: renderer, title: title })
      })
      addToPlaylistEntries.sort((a, b) => a.title.localeCompare(b.title))
      addToPlaylistEntries.forEach(function (entry) {
        addToPlaylistEntries[0].entryRenderer.parentNode.appendChild(entry.entryRenderer)
      })
    }
  }

  loadHide().then(function () {
    hidePlaylists()
    window.setTimeout(hidePlaylists, 200)
    window.setInterval(hidePlaylists, 1000)

    sortPlaylists()
    if (sortingEnabled) {
      window.setInterval(sortPlaylists, 2000)
    } else {
      window.setInterval(sortPlaylists, 30000)
    }
  })
})()
