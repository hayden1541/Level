.class public Lcom/levelup/yourlife/LockTask;
.super Ljava/lang/Object;
.source "LockTask.java"

# interfaces
.implements Ljava/lang/Runnable;


.field private act:Landroid/app/Activity;

.field private on:Z


.method public constructor <init>(Landroid/app/Activity;Z)V
    .registers 3

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/levelup/yourlife/LockTask;->act:Landroid/app/Activity;

    iput-boolean p2, p0, Lcom/levelup/yourlife/LockTask;->on:Z

    return-void
.end method


# show the activity on top of the lock screen while a timer runs
.method public run()V
    .registers 5

    iget-object v0, p0, Lcom/levelup/yourlife/LockTask;->act:Landroid/app/Activity;

    iget-boolean v1, p0, Lcom/levelup/yourlife/LockTask;->on:Z

    sget v2, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v3, 0x1b

    if-lt v2, v3, :cond_old

    invoke-virtual {v0, v1}, Landroid/app/Activity;->setShowWhenLocked(Z)V

    return-void

    :cond_old
    invoke-virtual {v0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object v0

    const/high16 v2, 0x80000

    if-eqz v1, :cond_clear

    invoke-virtual {v0, v2}, Landroid/view/Window;->addFlags(I)V

    return-void

    :cond_clear
    invoke-virtual {v0, v2}, Landroid/view/Window;->clearFlags(I)V

    return-void
.end method
