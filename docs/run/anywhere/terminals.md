# Getting Started

Installing with [`brew`] is most straight forward:

```sh
brew install pkgxdev/made/pkgx
```

If it is not [`brew`], then our installer is easiest:

```sh
curl -fsS https://pkgx.sh | sh
```

{% hint style='info' %}
Wanna read that script before you run it? [github.com/pkgxdev/setup/installer.sh][installer]
{% endhint %}


# Other Ways to Install

1. `pkgx` is a standalone binary, so (if you want) you can just download it directly:

```sh
# download it to `./pkgx`
curl -o ./pkgx --compressed -f --proto '=https' https://pkgx.sh/$(uname)/$(uname -m)

# install it to `/usr/local/bin/pkgx`
sudo install -m 755 pkgx /usr/local/bin

# check it works
pkgx --help
```

For your convenience we provide a `.tgz` so you can one-liner that:

```sh
curl -Ssf https://pkgx.sh/$(uname)/$(uname -m).tgz | sudo tar xz -C /usr/local/bin
```

&nbsp;

2. You can also download straight from [GitHub Releases].

{% hint style='warning' %}
If you download manually you’ll need to move the binary somewhere in
your `PATH`.
{% endhint %}

3. If you're on Arch Linux (or any of it's derivatives) you can also use the [`pkgx` AUR] (latest released version) or [`pkgx-git` AUR] (latest development version, might not be stable).

{% hint style='warning' %}
The AURs are community-maintained and might be out-of-date. Use them with caution.
{% endhint %}


[`brew`]: https://brew.sh
[GitHub Releases]: https://github.com/pkgxdev/pkgx/releases
[installer]: https://github.com/pkgxdev/setup/blob/main/installer.sh
[`pkgx` AUR]: https://aur.archlinux.org/packages/pkgx
[`pkgx-git` AUR]: https://aur.archlinux.org/packages/pkgx-git
