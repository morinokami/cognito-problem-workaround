https://github.com/aws-amplify/amplify-js/issues/987 の解決方法のデモ

問題点を整理すると、

- クライアント側で `Auth.updateUserAttributes` を実行すると、即座にユーザーの `email` と `email_verified` の値がそれぞれ新しいメールアドレスと `false` へと書き換えられてしまう
- このタイミングで、もしユーザーがログアウトすると、検証されたかどうかに関わらず新しいメールアドレスでログインできてしまう（逆に、以前のメールアドレスではログインできなくなる）
- さらに、もし新しいメールアドレスを間違えて入力した場合、ユーザーは再度ログインすることができなくなる

一番の問題は、`Auth.updateUserAttributes` の実行後に即座に属性値が書き換えられてしまうことである。以下は、この挙動を抑制し、ユーザーが新しいメールアドレスを検証したタイミングで初めて属性値を書き換えるようにするデモである。

全体フローのイメージは以下のようになる:

```
{ email } -> API Gateway -> updateEmail -> Cognito -> registerEmail
{ code } -> API Gateway -> confirmCode -> Cognito -> registerEmail
```

なお、実行にあたり、事前に Amplify CLI をインストールし、ユーザーを作成しておく必要がある:

```
$ npm install -g @aws-amplify/cli
$ amplify configure
```

## Step 1. Amplify によるアプリの作成

```
$ amplify init # すべてデフォルト値で Enter
$ amplify add auth # "How do you want users to be able to sign in?" にて "Email" を選択
$ amplify push
```

## Step 2. カスタムアトリビュートの登録

1. 作成された User Pool を開く
2. General settings > Attributes を開く
3. ページ下部の "Add custom attribute" をクリックする
4. 任意の名前（たとえば、"temp_email"）を入力する
5. "Save changes" をクリックする

## Step 3. アトリビュートへのアクセス権の設定

1. Step 2 の User Pool のページにおいて、General settings > App clients を開く
2. "\*\_app_clientWeb" と表示されているクライアントにおいて "Show Details" をクリックする
3. 下部にある "Set attribute read and write permissions" をクリックする
4. "Writable Attributes" において、先ほど作成した "custom:temp email" と、"name"、"phone number" にチェックを入れる
5. "Save app client changes" をクリックする

## Step 4. Lambda の設定

1. Lambda のページを開き、"Create function" を選択する
2. "Author from scratch" を選択した上で、"Function name" に任意の名前（たとえば、"verifyEmail"）を入力する
3. "Create function" をクリックする
4. 関数が作成されたら、`index.js` のコード部分に本リポジトリの `verifyEmail.js` をコピペする
5. "Deploy" をクリックする
6. "Permissions" のタブを開き、紐付けられた Role をクリックし、Role の設定画面を開く
7. "Attach policies" をクリックする
8. Lambda の実行権限として必要な `cognito-idp:AdminUpdateUserAttributes` をアタッチするため、"AmazonCognitoPowerUser" を選択し、"Attach policy" をクリックする

## Step 5. Cognito の Trigger において、上で作成した Lambda 関数 を登録する

1. 上で操作した User Pool において、General settings > Triggers を開く
2. "Custom message" の "Lambda function" として上で作成した verifyEmail を選択する
3. "Save changes" をクリックする

## Step 6. アプリの実行

```
$ yarn
$ yarn start # localhost:3000 が開かれる
```

## Step 7. 問題が解決していることの検証

1. "Create account" からアカウントを作成する（"Username" と "Email Address" には同じ値を入れる、また、電話番号は何でもよい）
2. 入力したメールアドレス宛に確認メールが送信されるので、コードを確認し、"Confirmation Code" のインプットに入力する
3. "Confirm" をクリックする（この時点で、"email"、"email_veiried"、"custom:temp_email" の値はそれぞれ古いメールアドレス、`true`、なし、となっている）
4. 一番上のインプットに異なるメールアドレスを入力し、"Update" をクリックする（この時点で、"email"、"email_veiried"、"custom:temp_email" の値はそれぞれ古いメールアドレス、`true`、新しいメールアドレス、となっている）
5. 新しいメールアドレス宛に確認メールが飛ぶが、User Pool などでユーザーの "email" の値が変化していないことを確認する
6. 下のインプットに確認コードを入力し、"Verify" をクリックする
7. 再度 User Pool において同ユーザーの "email" と "email_validated" の値を確認すると、前者は新しいメールアドレスへと置き換わり、後者は `true` となっているはずである
8. また、"Verify" をクリックせずにログアウトすると、以前のユーザーのままログインすることも確認可能である

## Step 8. 作成したアプリの消去

```
# amplify delete
```
