import { Notification, type NativeImage } from 'electron'

interface NotifyOptions {
  image?: NativeImage
  onClick?: () => void
}

const NOTIFICATION_IMAGE_MAX_WIDTH = 360
const liveNotifications = new Set<Notification>()

function notificationThumbnail(image: NativeImage): NativeImage {
  const { width } = image.getSize()
  return width > NOTIFICATION_IMAGE_MAX_WIDTH ? image.resize({ width: NOTIFICATION_IMAGE_MAX_WIDTH }) : image
}

export function notify(title: string, body: string, options: NotifyOptions = {}): void {
  const notification = new Notification({
    title,
    body,
    silent: true,
    ...(options.image ? { icon: notificationThumbnail(options.image) } : {})
  })
  liveNotifications.add(notification)
  notification.on('close', () => liveNotifications.delete(notification))
  if (options.onClick) {
    notification.on('click', options.onClick)
  }
  notification.show()
}
