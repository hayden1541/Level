.class public Lcom/levelup/yourlife/ScreenTask;
.super Ljava/lang/Object;
.source "ScreenTask.java"

# interfaces
.implements Ljava/lang/Runnable;


.field private act:Landroid/app/Activity;

.field private on:Z


.method public constructor <init>(Landroid/app/Activity;Z)V
    .registers 3

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/levelup/yourlife/ScreenTask;->act:Landroid/app/Activity;

    iput-boolean p2, p0, Lcom/levelup/yourlife/ScreenTask;->on:Z

    return-void
.end method


.method public run()V
    .registers 4

    iget-object v0, p0, Lcom/levelup/yourlife/ScreenTask;->act:Landroid/app/Activity;

    invoke-virtual {v0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object v0

    const/16 v1, 0x80

    iget-boolean v2, p0, Lcom/levelup/yourlife/ScreenTask;->on:Z

    if-eqz v2, :cond_off

    invoke-virtual {v0, v1}, Landroid/view/Window;->addFlags(I)V

    return-void

    :cond_off
    invoke-virtual {v0, v1}, Landroid/view/Window;->clearFlags(I)V

    return-void
.end method
