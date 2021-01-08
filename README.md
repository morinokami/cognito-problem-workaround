https://github.com/aws-amplify/amplify-js/issues/987 の解決方法のデモ

問題点を整理すると、

- クライアント側で `Auth.updateUserAttributes` を実行すると、即座にユーザーの `email` と `email_verified` の値がそれぞれ新しいメールアドレスと `false` へと書き換えられてしまう
- このタイミングで、もしユーザーがログアウトすると、検証されたかどうかに関わらず新しいメールアドレスでログインできてしまう（逆に、以前のメールアドレスではログインできなくなる）
- さらに、もし新しいメールアドレスを間違えて入力した場合、ユーザーは再度ログインすることができなくなる

一番の問題は、`Auth.updateUserAttributes` の実行後に即座に属性値が書き換えられてしまうことである。以下は、この挙動を抑制し、ユーザーが新しいメールアドレスを検証したタイミングで初めて属性値を書き換えるようにするデモである。

全体フローのイメージは以下のようになる:

```
[メールアドレス変更リクエストのフロー]
client -> { email } -> <API Gateway、認証> -> <Lambda: updateEmail> -> <Cognito> -> <Lambda: registerEmail>

[コード認証のフロー]
client -> { code } -> <API Gateway、認証> -> <Lambda: confirmCode> -> <Cognito> -> <Lambda: registerEmail>

updateEmailは、ユーザーから受け取ったメールアドレスを登録し、もとのメールアドレスをカスタムアトリビュートへと登録する
registerEmailは、登録されているメールアドレスとカスタムアトリビュートの値をスワップし、また両者が同一の値であれば意図的にエラーを起こし不要な認証コードが飛ぶことを防ぐ
confirmCodeは、ユーザーから受け取ったコードを確認し、問題なければカスタムアトリビュートの値をメールアドレスとして登録する
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

## Step 4. Cognito の Trigger により呼ばれる Lambda の設定

1. Lambda のページを開き、"Create function" を選択する
2. "Author from scratch" を選択した上で、"Function name" に任意の名前（たとえば、"verifyEmail"）を入力する
3. "Create function" をクリックする
4. 関数が作成されたら、`index.js` のコード部分に本リポジトリの `registerEmail.js` をコピペする
5. "Deploy" をクリックする
6. "Permissions" のタブを開き、紐付けられた Role をクリックし、Role の設定画面を開く
7. "Attach policies" をクリックする
8. Lambda の実行権限として必要な `cognito-idp:AdminUpdateUserAttributes` をアタッチするため、"AmazonCognitoPowerUser" を選択し、"Attach policy" をクリックする

## Step 5. Cognito において、上で作成した Lambda を登録する

1. 上で操作した User Pool において、General settings > Triggers を開く
2. "Custom message" の "Lambda function" として上で作成した verifyEmail を選択する
3. "Save changes" をクリックする

##　 Step 6. API Gateway から呼ばれる Lambda の設定

1. Lambda のページから、`updateEmail.js` と `confirmCode.js` をコピペした 二つの関数を作成する
2. 両者ともに、`USER_POOL_ID` という環境変数を作成し、値として使用する User Pool の ID を登録する
3. また、権限に関しては、Step 4 と同様に設定する
4. 二つの Lambda をデプロイする

## Step 7. API Gateway の設定

1. API Gateway において、新規に REST API を作成する
2. 更新用とコード確認用のエンドポイトとして二つのリソースを作成し、それぞれ CORS を有効化しておく
3. 両リソースに POST メソッドを作成する、このとき、"Integration Type" は "Lambda Function" を、"Lambda Function" には Step 6 において作成した関数をそれぞれ設定し、また "Use Lambda Proxy integration" にチェックを入れておく
4. 新しい Authorizer を作成する、このとき、"Type" は "Cognito" を、"Cognito User Pool" は使用する User Pool の ID を、また "Token Source" には "Authorization" をそれぞれ設定する
5. 作成した POST メソッドの "Method Request" において、"Authorization" に上で作成した Authorizer を設定する
6. API をデプロイする
7. メールアドレス更新とコード認証に対応するエンドポイントにより、App.js の 20 行目と 42 行目を置き換える

## Step 8. アプリの実行

```
$ yarn
$ yarn start # localhost:3000 が開かれる
```

## Step 9. 問題が解決していることの検証

1. "Create account" からアカウントを作成する（"Username" と "Email Address" には同じ値を入れる、また、電話番号は何でもよい）
2. 入力したメールアドレス宛に確認メールが送信されるので、コードを確認し、"Confirmation Code" のインプットに入力する
3. "Confirm" をクリックする（この時点で、"email"、"email_veiried"、"custom:temp_email" の値はそれぞれ古いメールアドレス、`true`、なし、となっている）
4. 一番上のインプットに異なるメールアドレスを入力し、"Update" をクリックする（この時点で、"email"、"email_veiried"、"custom:temp_email" の値はそれぞれ古いメールアドレス、`true`、新しいメールアドレス、となっている）
5. 新しいメールアドレス宛に確認メールが飛ぶが、User Pool などでユーザーの "email" の値が変化していないことを確認する
6. 下のインプットに確認コードを入力し、"Verify" をクリックする
7. 再度 User Pool において同ユーザーの "email" と "email_validated" の値を確認すると、前者は新しいメールアドレスへと置き換わり、後者は `true` が保持されているはずである
8. また、"Verify" をクリックせずにログアウトすると、以前のユーザーのままログインすることも確認可能である

## Step 10. 作成したアプリの消去

```
# amplify delete
```
