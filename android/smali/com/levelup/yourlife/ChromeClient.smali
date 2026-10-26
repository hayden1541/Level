.class public Lcom/levelup/yourlife/ChromeClient;
.super Landroid/webkit/WebChromeClient;
.source "ChromeClient.java"

# Opens the system file picker for <input type="file"> (Excel/CSV upload for flashcards).


.field private act:Lcom/levelup/yourlife/MainActivity;


.method public constructor <init>(Lcom/levelup/yourlife/MainActivity;)V
    .registers 2

    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V

    iput-object p1, p0, Lcom/levelup/yourlife/ChromeClient;->act:Lcom/levelup/yourlife/MainActivity;

    return-void
.end method


.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 8

    iget-object v0, p0, Lcom/levelup/yourlife/ChromeClient;->act:Lcom/levelup/yourlife/MainActivity;

    # cancel any picker that never returned
    iget-object v1, v0, Lcom/levelup/yourlife/MainActivity;->fileCb:Landroid/webkit/ValueCallback;

    if-eqz v1, :cond_nostale

    const/4 v2, 0x0

    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    :cond_nostale
    iput-object p2, v0, Lcom/levelup/yourlife/MainActivity;->fileCb:Landroid/webkit/ValueCallback;

    :try_start_0
    new-instance v1, Landroid/content/Intent;

    const-string v2, "android.intent.action.GET_CONTENT"

    invoke-direct {v1, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v2, "android.intent.category.OPENABLE"

    invoke-virtual {v1, v2}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;

    const-string v2, "*/*"

    invoke-virtual {v1, v2}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    const/16 v2, 0x2a

    invoke-virtual {v0, v1, v2}, Landroid/app/Activity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :fail

    const/4 v1, 0x1

    return v1

    :fail
    const/4 v1, 0x0

    iput-object v1, v0, Lcom/levelup/yourlife/MainActivity;->fileCb:Landroid/webkit/ValueCallback;

    invoke-interface {p2, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    const/4 v1, 0x1

    return v1
.end method
