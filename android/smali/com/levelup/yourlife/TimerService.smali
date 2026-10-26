.class public Lcom/levelup/yourlife/TimerService;
.super Landroid/app/Service;
.source "TimerService.java"

# Foreground service: keeps the app alive with the screen off and shows a
# pixel-styled live countdown notification (also on the lock screen).


.field private fTitle:Ljava/lang/String;

.field private fText:Ljava/lang/String;

.field private fWhen:J

.field private fDown:Z

.field private fRun:Z

.field private fBmp:Landroid/graphics/Bitmap;


.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Landroid/app/Service;-><init>()V

    return-void
.end method


.method public onBind(Landroid/content/Intent;)Landroid/os/IBinder;
    .registers 3

    const/4 v0, 0x0

    return-object v0
.end method


# fills one of the notif_small / notif_big layouts from the fields
.method private fill(Landroid/widget/RemoteViews;)V
    .registers 12

    invoke-virtual {p0}, Landroid/content/Context;->getResources()Landroid/content/res/Resources;

    move-result-object v6

    invoke-virtual {p0}, Landroid/content/Context;->getPackageName()Ljava/lang/String;

    move-result-object v7

    const-string v8, "id"

    iget-object v9, p0, Lcom/levelup/yourlife/TimerService;->fBmp:Landroid/graphics/Bitmap;

    if-eqz v9, :cond_noimg

    const-string v0, "n_img"

    invoke-virtual {v6, v0, v8, v7}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v0

    invoke-virtual {p1, v0, v9}, Landroid/widget/RemoteViews;->setImageViewBitmap(ILandroid/graphics/Bitmap;)V

    :cond_noimg
    const-string v0, "n_title"

    invoke-virtual {v6, v0, v8, v7}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v0

    iget-object v9, p0, Lcom/levelup/yourlife/TimerService;->fTitle:Ljava/lang/String;

    invoke-virtual {p1, v0, v9}, Landroid/widget/RemoteViews;->setTextViewText(ILjava/lang/CharSequence;)V

    const-string v0, "n_sub"

    invoke-virtual {v6, v0, v8, v7}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v0

    iget-object v9, p0, Lcom/levelup/yourlife/TimerService;->fText:Ljava/lang/String;

    invoke-virtual {p1, v0, v9}, Landroid/widget/RemoteViews;->setTextViewText(ILjava/lang/CharSequence;)V

    const-string v0, "n_clock"

    invoke-virtual {v6, v0, v8, v7}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v1

    # chronometer base = elapsedRealtime + (when - now)
    invoke-static {}, Landroid/os/SystemClock;->elapsedRealtime()J

    move-result-wide v2

    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v4

    iget-wide v6, p0, Lcom/levelup/yourlife/TimerService;->fWhen:J

    sub-long/2addr v6, v4

    add-long/2addr v2, v6

    move-object v0, p1

    const/4 v4, 0x0

    iget-boolean v5, p0, Lcom/levelup/yourlife/TimerService;->fRun:Z

    invoke-virtual/range {v0 .. v5}, Landroid/widget/RemoteViews;->setChronometer(IJLjava/lang/String;Z)V

    iget-boolean v4, p0, Lcom/levelup/yourlife/TimerService;->fDown:Z

    invoke-virtual {v0, v1, v4}, Landroid/widget/RemoteViews;->setChronometerCountDown(IZ)V

    return-void
.end method


.method public onStartCommand(Landroid/content/Intent;II)I
    .registers 16

    if-nez p1, :cond_has

    invoke-virtual {p0}, Landroid/app/Service;->stopSelf()V

    const/4 v0, 0x2

    return v0

    :cond_has
    const/4 v0, 0x0

    iput-object v0, p0, Lcom/levelup/yourlife/TimerService;->fBmp:Landroid/graphics/Bitmap;

    # character picture (PNG, base64) rendered by the web app
    :try_start_img
    const-string v0, "img"

    invoke-virtual {p1, v0}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_imgdone

    const/4 v7, 0x0

    invoke-static {v0, v7}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object v0

    array-length v7, v0

    const/4 v8, 0x0

    invoke-static {v0, v8, v7}, Landroid/graphics/BitmapFactory;->decodeByteArray([BII)Landroid/graphics/Bitmap;

    move-result-object v0

    iput-object v0, p0, Lcom/levelup/yourlife/TimerService;->fBmp:Landroid/graphics/Bitmap;
    :try_end_img
    .catchall {:try_start_img .. :try_end_img} :cond_imgdone

    :cond_imgdone
    :try_start_0
    const-string v0, "title"

    invoke-virtual {p1, v0}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    iput-object v1, p0, Lcom/levelup/yourlife/TimerService;->fTitle:Ljava/lang/String;

    const-string v0, "text"

    invoke-virtual {p1, v0}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v2

    iput-object v2, p0, Lcom/levelup/yourlife/TimerService;->fText:Ljava/lang/String;

    const-string v0, "when"

    const-wide/16 v4, 0x0

    invoke-virtual {p1, v0, v4, v5}, Landroid/content/Intent;->getLongExtra(Ljava/lang/String;J)J

    move-result-wide v4

    iput-wide v4, p0, Lcom/levelup/yourlife/TimerService;->fWhen:J

    const-string v0, "down"

    const/4 v3, 0x0

    invoke-virtual {p1, v0, v3}, Landroid/content/Intent;->getBooleanExtra(Ljava/lang/String;Z)Z

    move-result v3

    iput-boolean v3, p0, Lcom/levelup/yourlife/TimerService;->fDown:Z

    const-string v0, "run"

    const/4 v7, 0x1

    invoke-virtual {p1, v0, v7}, Landroid/content/Intent;->getBooleanExtra(Ljava/lang/String;Z)Z

    move-result v7

    iput-boolean v7, p0, Lcom/levelup/yourlife/TimerService;->fRun:Z

    const-string v0, "notification"

    invoke-virtual {p0, v0}, Landroid/app/Service;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v6

    check-cast v6, Landroid/app/NotificationManager;

    const-string v7, "luyl_running"

    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v8, 0x1a

    if-lt v0, v8, :cond_nochan

    new-instance v0, Landroid/app/NotificationChannel;

    const-string v8, "공부 중 표시"

    const/4 v9, 0x2

    invoke-direct {v0, v7, v8, v9}, Landroid/app/NotificationChannel;-><init>(Ljava/lang/String;Ljava/lang/CharSequence;I)V

    const/4 v9, 0x0

    invoke-virtual {v0, v9}, Landroid/app/NotificationChannel;->setShowBadge(Z)V

    const/4 v9, 0x1

    invoke-virtual {v0, v9}, Landroid/app/NotificationChannel;->setLockscreenVisibility(I)V

    invoke-virtual {v6, v0}, Landroid/app/NotificationManager;->createNotificationChannel(Landroid/app/NotificationChannel;)V

    :cond_nochan
    new-instance v0, Landroid/content/Intent;

    const-class v8, Lcom/levelup/yourlife/MainActivity;

    invoke-direct {v0, p0, v8}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const/high16 v8, 0x30000000

    invoke-virtual {v0, v8}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    const/4 v8, 0x1

    const/high16 v9, 0xc000000

    invoke-static {p0, v8, v0, v9}, Landroid/app/PendingIntent;->getActivity(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;

    move-result-object v8

    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v9, 0x1a

    if-lt v0, v9, :cond_oldbuilder

    new-instance v9, Landroid/app/Notification$Builder;

    invoke-direct {v9, p0, v7}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;Ljava/lang/String;)V

    goto :goto_built

    :cond_oldbuilder
    new-instance v9, Landroid/app/Notification$Builder;

    invoke-direct {v9, p0}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;)V

    :goto_built
    invoke-virtual {p0}, Landroid/content/Context;->getResources()Landroid/content/res/Resources;

    move-result-object v0

    invoke-virtual {p0}, Landroid/content/Context;->getPackageName()Ljava/lang/String;

    move-result-object v7

    const-string v10, "ic_stat"

    const-string v11, "drawable"

    invoke-virtual {v0, v10, v11, v7}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v10

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setSmallIcon(I)Landroid/app/Notification$Builder;

    invoke-virtual {v9, v1}, Landroid/app/Notification$Builder;->setContentTitle(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    invoke-virtual {v9, v2}, Landroid/app/Notification$Builder;->setContentText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    const/4 v10, 0x1

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setOngoing(Z)Landroid/app/Notification$Builder;

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setOnlyAlertOnce(Z)Landroid/app/Notification$Builder;

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setVisibility(I)Landroid/app/Notification$Builder;

    const/4 v10, 0x0

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setShowWhen(Z)Landroid/app/Notification$Builder;

    invoke-virtual {v9, v8}, Landroid/app/Notification$Builder;->setContentIntent(Landroid/app/PendingIntent;)Landroid/app/Notification$Builder;

    const v10, -0xe8ead6

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setColor(I)Landroid/app/Notification$Builder;

    # paint the whole notification in the app's ink color (honoured for foreground-service notifications)
    sget v10, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v11, 0x1a

    if-lt v10, v11, :cond_nocolorize

    const/4 v10, 0x1

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setColorized(Z)Landroid/app/Notification$Builder;

    :cond_nocolorize

    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :bail

    # custom pixel views; if anything here fails the plain notification is still used
    :try_start_custom
    # collapsed view
    const-string v10, "notif_small"

    const-string v11, "layout"

    invoke-virtual {v0, v10, v11, v7}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v10

    new-instance v11, Landroid/widget/RemoteViews;

    invoke-direct {v11, v7, v10}, Landroid/widget/RemoteViews;-><init>(Ljava/lang/String;I)V

    invoke-direct {p0, v11}, Lcom/levelup/yourlife/TimerService;->fill(Landroid/widget/RemoteViews;)V

    invoke-virtual {v9, v11}, Landroid/app/Notification$Builder;->setCustomContentView(Landroid/widget/RemoteViews;)Landroid/app/Notification$Builder;

    # expanded view
    const-string v10, "notif_big"

    const-string v11, "layout"

    invoke-virtual {v0, v10, v11, v7}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v10

    new-instance v11, Landroid/widget/RemoteViews;

    invoke-direct {v11, v7, v10}, Landroid/widget/RemoteViews;-><init>(Ljava/lang/String;I)V

    invoke-direct {p0, v11}, Lcom/levelup/yourlife/TimerService;->fill(Landroid/widget/RemoteViews;)V

    invoke-virtual {v9, v11}, Landroid/app/Notification$Builder;->setCustomBigContentView(Landroid/widget/RemoteViews;)Landroid/app/Notification$Builder;

    new-instance v10, Landroid/app/Notification$DecoratedCustomViewStyle;

    invoke-direct {v10}, Landroid/app/Notification$DecoratedCustomViewStyle;-><init>()V

    invoke-virtual {v9, v10}, Landroid/app/Notification$Builder;->setStyle(Landroid/app/Notification$Style;)Landroid/app/Notification$Builder;
    :try_end_custom
    .catchall {:try_start_custom .. :try_end_custom} :cond_nocustom

    :cond_nocustom
    :try_start_build
    invoke-virtual {v9}, Landroid/app/Notification$Builder;->build()Landroid/app/Notification;

    move-result-object v9
    :try_end_build
    .catchall {:try_start_build .. :try_end_build} :bail

    :try_start_1
    const/16 v0, 0xbb9

    invoke-virtual {p0, v0, v9}, Landroid/app/Service;->startForeground(ILandroid/app/Notification;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :cond_notify

    const/4 v0, 0x2

    return v0

    :cond_notify
    :try_start_2
    const/16 v0, 0xbb9

    invoke-virtual {v6, v0, v9}, Landroid/app/NotificationManager;->notify(ILandroid/app/Notification;)V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :bail

    :bail
    const/4 v0, 0x2

    return v0
.end method


.method public onDestroy()V
    .registers 2

    :try_start_0
    const/4 v0, 0x1

    invoke-virtual {p0, v0}, Landroid/app/Service;->stopForeground(Z)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :cond_super

    :cond_super
    invoke-super {p0}, Landroid/app/Service;->onDestroy()V

    return-void
.end method
