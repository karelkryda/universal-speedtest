# Universal Speedtest

<hr>
<div>
    <img src="https://img.shields.io/github/actions/workflow/status/karelkryda/universal-speedtest/lint.yml?branch=main&label=Lint&logo=github&style=for-the-badge" alt="Lint check">
    <img src="https://img.shields.io/github/actions/workflow/status/karelkryda/universal-speedtest/build.yml?branch=main&logo=github&style=for-the-badge" alt="Build check">
    <img src="https://img.shields.io/github/actions/workflow/status/karelkryda/universal-speedtest/tests.yml?branch=main&label=Tests&logo=github&style=for-the-badge" alt="Tests">
</div>
<div>
    <img src="https://img.shields.io/npm/v/universal-speedtest?logo=npm&style=for-the-badge" alt="Npm version">
    <img src="https://img.shields.io/github/languages/code-size/karelkryda/universal-speedtest?logo=npm&style=for-the-badge" alt="Code size">
    <img src="https://img.shields.io/npm/dw/universal-speedtest?logo=npm&style=for-the-badge" alt="Downloads">
</div>
<div>
    <img src="https://img.shields.io/github/issues/karelkryda/universal-speedtest?logo=github&style=for-the-badge" alt="Github issues">
    <img src="https://img.shields.io/github/stars/karelkryda/universal-speedtest?logo=github&style=for-the-badge" alt="Github stars">
    <img src="https://img.shields.io/github/license/karelkryda/universal-speedtest?logo=github&style=for-the-badge" alt="License">
</div>
<hr>

The Universal Speedtest library allows you to measure the speed of your Internet connection using various speed tests.

## 🔧 Installation

### Latest release

```bash
$ npm install --save universal-speedtest
```

### Latest development build

```bash
$ npm install --save github:karelkryda/universal-speedtest#build
```

## 📗 Documentation

The official documentation can be found [here](https://karel-kryda.gitbook.io/universal-speedtest/).

## 🛑 Known limitations

According to the reported problems, the library cannot currently be used together with React Native (and probably not
even in the browser). This is due to the use of `perf_hooks` in the `urllib` library, which is used to perform speed
tests.

## 📢 Issues reporting

A new major version of the library, 3.0.0, has been released and may contain bugs. I would like to ask you to report any
problems so that I can fix them.

Thank you for your understanding
